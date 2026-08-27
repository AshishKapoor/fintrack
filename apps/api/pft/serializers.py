from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import NotificationPreference
from .notifications import is_safe_outbound_url

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
            raise serializers.ValidationError({"email": _("Email is required.")})

        # Ensure username is set to email
        if "username" not in data or not data["username"]:
            data["username"] = data["email"]

        if data["password"] != data.pop("confirm_password"):
            raise serializers.ValidationError(
                {"password": _("Passwords do not match.")}
            )
        if len(data["password"]) < 8:
            raise serializers.ValidationError(
                {"password": _("Password must be at least 8 characters long.")}
            )
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "email_enabled",
            "ntfy_enabled",
            "ntfy_server_url",
            "ntfy_topic",
            "webhook_enabled",
            "webhook_url",
            "budget_alerts_enabled",
            "budget_alert_threshold",
            "reminders_enabled",
            "reminder_days_before",
            "weekly_digest_enabled",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_budget_alert_threshold(self, value):
        # Mirrors the DB CheckConstraint (notification_budget_alert_threshold_range)
        # so a bad value gets a clean 400 here instead of a 500 from the
        # IntegrityError it would otherwise raise on save.
        if not (1 <= value <= 100):
            raise serializers.ValidationError(_("Must be between 1 and 100."))
        return value

    def validate_reminder_days_before(self, value):
        # Mirrors the DB CheckConstraint (notification_reminder_days_before_range).
        if not (0 <= value <= 30):
            raise serializers.ValidationError(_("Must be between 0 and 30."))
        return value

    def validate_ntfy_server_url(self, value):
        if not is_safe_outbound_url(value):
            raise serializers.ValidationError(
                _("This URL can't be reached, or points at a private network address.")
            )
        return value

    def validate_webhook_url(self, value):
        if value and not is_safe_outbound_url(value):
            raise serializers.ValidationError(
                _("This URL can't be reached, or points at a private network address.")
            )
        return value

    def validate(self, attrs):
        # merge onto the existing instance so a PATCH that only sends
        # {"ntfy_enabled": true} is validated against the topic already saved,
        # not against an empty one attrs doesn't include.
        merged = {}
        if self.instance is not None:
            for field in self.Meta.fields:
                merged[field] = getattr(self.instance, field, None)
        merged.update(attrs)

        if merged.get("ntfy_enabled") and not merged.get("ntfy_topic"):
            raise serializers.ValidationError(
                {"ntfy_topic": _("A topic is required to enable ntfy notifications.")}
            )
        if merged.get("webhook_enabled") and not merged.get("webhook_url"):
            raise serializers.ValidationError(
                {"webhook_url": _("A URL is required to enable webhook notifications.")}
            )
        return attrs
