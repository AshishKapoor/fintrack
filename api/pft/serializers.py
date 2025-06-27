from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    Transaction, Category, Budget
)

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "location",
            "bio",
            "department",
            "role",
        )
        read_only_fields = ("email", "role")


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)
    username = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "password",
            "confirm_password",
            "first_name",
            "last_name",
            "phone_number",
            "location",
            "bio",
            "department",
        )

    def validate(self, data):
        if not data.get("email"):
            raise serializers.ValidationError({"email": "Email is required."})

        # Ensure username is set to email
        if "username" not in data or not data["username"]:
            data["username"] = data["email"]

        if data["password"] != data.pop("confirm_password"):
            raise serializers.ValidationError({"password": "Passwords do not match."})
        if len(data["password"]) < 8:
            raise serializers.ValidationError(
                {"password": "Password must be at least 8 characters long."}
            )
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CategorySerializer(serializers.ModelSerializer):
    def validate_name(self, value):
        user = self.context["request"].user
        # Check if category with same name exists for this user
        if Category.objects.filter(user=user, name=value).exists():
            raise serializers.ValidationError(
                "A category with this name already exists."
            )
        return value

    class Meta:
        model = Category
        fields = "__all__"
        read_only_fields = ["user"]


class TransactionSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        model = Transaction
        fields = ['id', 'user', 'title', 'amount', 'type', 'category',
                 'transaction_date', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def to_representation(self, instance):
        # Ensure amount is always serialized as Decimal
        ret = super().to_representation(instance)
        ret['amount'] = str(instance.amount)
        return ret

    def create(self, validated_data):
        # Handle the amount encryption during creation
        amount = validated_data.pop('amount', None)
        transaction = Transaction(**validated_data)
        if amount is not None:
            transaction.amount = str(amount)
        transaction.save()
        return transaction

    def update(self, instance, validated_data):
        # Handle the amount encryption during update
        amount = validated_data.pop('amount', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if amount is not None:
            instance.amount = str(amount)
        instance.save()
        return instance

class BudgetSerializer(serializers.ModelSerializer):
    def validate(self, data):
        user = self.context["request"].user
        # Check if budget already exists for this user, category, month, and year
        try:
            existing_budget = Budget.objects.get(
                user=user,
                category=data["category"],
                month=data["month"],
                year=data["year"],
            )

            # If this is an update operation for this exact budget, allow it
            if self.instance and self.instance.id == existing_budget.id:
                return data

            # For POST requests, update the existing budget instead of creating a new one
            if not self.instance:
                self.instance = existing_budget

            return data
        except Budget.DoesNotExist:
            # No existing budget, so we can create a new one
            return data

    class Meta:
        model = Budget
        fields = "__all__"
        read_only_fields = ["user"]
