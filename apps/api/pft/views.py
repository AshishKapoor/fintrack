from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenViewBase

from .auth_cookies import (
    REFRESH_COOKIE_NAME,
    clear_refresh_cookie,
    set_refresh_cookie,
    wants_refresh_cookie,
)
from .models import (
    Budget,
    Category,
    NotificationPreference,
    Transaction,
)
from .notifications import send_test_notification
from .serializers import (
    BudgetSerializer,
    CategorySerializer,
    NotificationPreferenceSerializer,
    TransactionSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

REFRESH_COOKIE_HEADER_PARAMETER = OpenApiParameter(
    name="X-Use-Refresh-Cookie",
    type=str,
    location=OpenApiParameter.HEADER,
    required=False,
    description=(
        "Send '1' to receive the refresh token as an HttpOnly cookie instead "
        "of in the response body, so page JavaScript never has a copy of it. "
        "Omit this header to get the plain {access, refresh} body (used by "
        "the official SDKs and scripts). Once a refresh token has arrived via "
        "the cookie, subsequent calls keep rotating it back into a cookie "
        "even without this header."
    ),
)


class CustomPagination(PageNumberPagination):
    page_size = 100


# The flat /api/v1/{transactions,categories,budgets} resources predate the
# double-entry ledger at /api/v1/finance/*. Both are live, both are seeded on
# signup, and nothing keeps them in sync - see ARCHITECTURE.md. The ledger is
# the one being kept, so these announce themselves as deprecated to anything
# scripting against them, per RFC 9745. No Sunset header (RFC 8594) is sent
# because removal is tied to the v1.0.0 release, not a calendar date.
LEGACY_SUNSET_VERSION = "v1.0.0"
LEGACY_SUCCESSOR = "/api/v1/finance/"
# RFC 9745 Deprecation value: @<unix-timestamp> of when the deprecation
# took effect (2026-08-12T00:00:00Z, the day these headers shipped).
LEGACY_DEPRECATED_AT = "@1786492800"


class DeprecatedLegacyEndpointMixin:
    """Attach deprecation headers to the flat v1 resources."""

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Deprecation"] = LEGACY_DEPRECATED_AT
        response["Link"] = f'<{LEGACY_SUCCESSOR}>; rel="successor-version"'
        response["Warning"] = (
            f'299 - "This endpoint is deprecated and will be removed in '
            f'{LEGACY_SUNSET_VERSION}. Use {LEGACY_SUCCESSOR} instead."'
        )
        return response


def blacklist_all_refresh_tokens(user):
    """Revoke every outstanding refresh token for a user.

    Used on logout-everywhere and after a password change, so a stolen refresh
    token stops working the moment the owner reacts.
    """
    revoked = 0
    for outstanding in OutstandingToken.objects.filter(user=user):
        _, created = BlacklistedToken.objects.get_or_create(token=outstanding)
        if created:
            revoked += 1
    return revoked


@extend_schema(parameters=[REFRESH_COOKIE_HEADER_PARAMETER])
class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login, rate limited per IP so the password field cannot be brute forced.

    Browser clients that send `X-Use-Refresh-Cookie` get the refresh token
    back as an HttpOnly cookie instead of in the response body - see
    pft/auth_cookies.py. Everyone else keeps the plain {access, refresh} body.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200 and wants_refresh_cookie(request):
            refresh = response.data.pop("refresh", None)
            if refresh is not None:
                set_refresh_cookie(response, refresh)
        return response


@extend_schema(parameters=[REFRESH_COOKIE_HEADER_PARAMETER])
class CookieTokenRefreshView(TokenViewBase):
    """Refresh an access token.

    Reads the refresh token from the `pft_refresh` HttpOnly cookie when
    present (the browser flow), falling back to a `refresh` field in the body
    for the SDKs and anything else that does not carry cookies. Once a refresh
    token arrives via the cookie, the rotated replacement goes back into a
    cookie too, even if the caller forgets to resend the opt-in header -
    cookie-in implies cookie-out.

    Subclasses SimpleJWT's TokenViewBase (rather than a plain APIView) to
    inherit its `get_authenticate_header` override - without it, DRF coerces
    an invalid-token 401 into a 403 whenever authentication_classes is empty.
    """

    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        cookie_refresh = request.COOKIES.get(REFRESH_COOKIE_NAME)
        refresh = cookie_refresh or request.data.get("refresh")
        use_cookie = bool(cookie_refresh) or wants_refresh_cookie(request)

        if not refresh:
            return Response(
                {"detail": _("No refresh token found."), "code": "token_not_found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        data = dict(serializer.validated_data)
        new_refresh = data.pop("refresh", None)

        if use_cookie:
            response = Response(data, status=status.HTTP_200_OK)
            if new_refresh is not None:
                set_refresh_cookie(response, new_refresh)
            return response

        if new_refresh is not None:
            data["refresh"] = new_refresh
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(parameters=[REFRESH_COOKIE_HEADER_PARAMETER])
class LogoutView(APIView):
    """Revoke a refresh token.

    POST {"refresh": "<token>"} revokes that token; the `pft_refresh` HttpOnly
    cookie is used instead when present. POST {"all": true} revokes every
    session for the current user. Either way, any refresh cookie is cleared.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.data.get("all"):
            revoked = blacklist_all_refresh_tokens(request.user)
            response = Response(
                {"detail": _("All sessions signed out."), "revoked": revoked}
            )
            clear_refresh_cookie(response)
            return response

        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME) or request.data.get(
            "refresh"
        )
        if not refresh_token:
            return Response(
                {"detail": _("refresh is required (or pass all=true).")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            # An already-revoked or malformed token means the caller is signed
            # out either way; do not leak which case it was.
            pass

        response = Response({"detail": _("Signed out.")})
        clear_refresh_cookie(response)
        return response


# CATEGORY VIEWSET
@extend_schema(
    deprecated=True,
    description=f"Deprecated legacy resource; use {LEGACY_SUCCESSOR} instead.",
)
class CategoryViewSet(DeprecatedLegacyEndpointMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        owned = Category.objects.filter(user=self.request.user)

        # Global categories (user IS NULL) are shared by every account, so they
        # are readable by all but writable by none: including them in the
        # write queryset let any user edit or delete them for everybody.
        if self.request.method not in permissions.SAFE_METHODS:
            return owned.order_by("name", "id")

        return (owned | Category.objects.filter(user__isnull=True)).order_by(
            "name", "id"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


# TRANSACTION VIEWSET
@extend_schema(
    deprecated=True,
    description=f"Deprecated legacy resource; use {LEGACY_SUCCESSOR} instead.",
)
class TransactionViewSet(DeprecatedLegacyEndpointMixin, viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "category__name"]
    ordering_fields = [
        "transaction_date",
        "amount",
        "created_at",
        "updated_at",
        "title",
    ]
    ordering = ["-transaction_date", "-id"]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user).order_by(
            "-transaction_date", "-id"
        )

        # Date range filtering
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            queryset = queryset.filter(transaction_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__lte=end_date)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


# BUDGET VIEWSET
@extend_schema(
    deprecated=True,
    description=f"Deprecated legacy resource; use {LEGACY_SUCCESSOR} instead.",
)
class BudgetViewSet(DeprecatedLegacyEndpointMixin, viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).order_by(
            "-year", "-month", "id"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # If an existing budget was found in validation, update it
        if serializer.instance:
            serializer.update(serializer.instance, serializer.validated_data)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Otherwise create a new budget
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class RegisterUserAPIView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        # Get email from request data
        email = request.data.get("email")

        # Check if email is provided
        if not email:
            return Response(
                {"email": [_("Email is required.")]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate email format
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"email": [_("Enter a valid email address.")]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if email already exists
        if get_user_model().objects.filter(email=email).exists():
            return Response(
                {
                    "email": [
                        _("Something went wrong. Please contact support or try again.")
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Set username to email before passing to serializer
        mutable_data = request.data.copy()
        mutable_data["username"] = email
        request._full_data = mutable_data

        return super().create(request, *args, **kwargs)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class DeleteAccountView(APIView):
    """Permanently delete the caller's account and everything it owns.

    Requires the current password and an explicit confirmation string, because
    the cascade takes every budget file, account, transaction and posting with
    it and there is no undo.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_change"

    CONFIRMATION = "DELETE"

    def post(self, request):
        user = request.user
        password = request.data.get("password")
        confirmation = request.data.get("confirmation")

        if not password:
            return Response(
                {"error": _("Your password is required to delete your account.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response(
                {"error": _("Password is incorrect")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if confirmation != self.CONFIRMATION:
            return Response(
                {"error": _("Type %(confirmation)s to confirm.") % {"confirmation": self.CONFIRMATION}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Revoke sessions before the rows disappear, so no token outlives the
        # account it belonged to.
        blacklist_all_refresh_tokens(user)
        user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_change"

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not current_password or not new_password or not confirm_password:
            return Response(
                {"error": _("All password fields are required")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(current_password):
            return Response(
                {"error": _("Current password is incorrect")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"error": _("New passwords do not match")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"error": list(e)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        # Changing a password must end every other session, otherwise a stolen
        # refresh token survives the exact event meant to stop it.
        blacklist_all_refresh_tokens(user)

        return Response(
            {
                "message": _("Password updated successfully"),
                "detail": _("All existing sessions have been signed out."),
            },
            status=status.HTTP_200_OK,
        )


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """One row per user, created on first access - see the model's docstring.

    A GET before any Save is what powers the settings tab showing sensible
    defaults (budget alerts on, threshold 90%, everything else off) rather
    than a 404 for every user who has never touched this tab.
    """

    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        preference, _created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return preference


class NotificationTestView(APIView):
    """Send a real notification now, on every enabled channel, bypassing dedupe."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "notification_test"

    def post(self, request):
        preference, _created = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        attempted = send_test_notification(preference)
        if not attempted:
            return Response(
                {"detail": _("Turn on at least one delivery channel first.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"attempted_channels": attempted})
