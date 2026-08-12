from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from drf_spectacular.utils import extend_schema
from rest_framework import filters, generics, permissions, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Budget,
    Category,
    Transaction,
)
from .serializers import (
    BudgetSerializer,
    CategorySerializer,
    TransactionSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
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


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login, rate limited per IP so the password field cannot be brute forced."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class LogoutView(APIView):
    """Revoke a refresh token.

    POST {"refresh": "<token>"} revokes that token. POST {"all": true} revokes
    every session for the current user.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.data.get("all"):
            revoked = blacklist_all_refresh_tokens(request.user)
            return Response({"detail": "All sessions signed out.", "revoked": revoked})

        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "refresh is required (or pass all=true)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            # An already-revoked or malformed token means the caller is signed
            # out either way; do not leak which case it was.
            pass

        return Response({"detail": "Signed out."})


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
                {"email": ["Email is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate email format
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {"email": ["Enter a valid email address."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if email already exists
        if get_user_model().objects.filter(email=email).exists():
            return Response(
                {
                    "email": [
                        "Something went wrong. Please contact support or try again."
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
                {"error": "Your password is required to delete your account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(password):
            return Response(
                {"error": "Password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if confirmation != self.CONFIRMATION:
            return Response(
                {"error": f"Type {self.CONFIRMATION} to confirm."},
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
                {"error": "All password fields are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(current_password):
            return Response(
                {"error": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {"error": "New passwords do not match"},
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
                "message": "Password updated successfully",
                "detail": "All existing sessions have been signed out.",
            },
            status=status.HTTP_200_OK,
        )
