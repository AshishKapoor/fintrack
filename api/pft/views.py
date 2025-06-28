from rest_framework import generics, permissions, viewsets, status, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    Budget, Category, Transaction,
)
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .serializers import (
    BudgetSerializer,
    CategorySerializer,
    TransactionSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
)

class CustomPagination(PageNumberPagination):
    page_size = 100


# CATEGORY VIEWSET
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        return Category.objects.filter(
            user=self.request.user
        ) | Category.objects.filter(user__isnull=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# TRANSACTION VIEWSET
class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        queryset = Transaction.objects.filter(user=self.request.user)

        # Date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(transaction_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__lte=end_date)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# BUDGET VIEWSET
class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
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
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class RegisterUserAPIView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

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
        mutable_data['username'] = email
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


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

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
        return Response(
            {"message": "Password updated successfully"}, status=status.HTTP_200_OK
        )
