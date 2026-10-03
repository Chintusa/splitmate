import re
from rest_framework import serializers
from apps.accounts.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'is_email_verified', 'created_at']


# ---------------------------------------------------------------------------
# Registration (2-step)
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.Serializer):
    """Step 1 — collect details and initiate email verification."""
    name = serializers.CharField(max_length=255, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    confirm_password = serializers.CharField(min_length=8, max_length=128, write_only=True)

    def validate_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Name must be at least 2 characters.")
        return value.strip()

    def validate_password(self, value):
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError(
                "Password must contain at least one letter."
            )
        if not re.search(r'\d', value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )
        return value

    def validate(self, data):
        if data.get('password') != data.get('confirm_password'):
            raise serializers.ValidationError(
                {'confirm_password': "Passwords do not match."}
            )
        return data


class VerifyEmailSerializer(serializers.Serializer):
    """Step 2 — verify the OTP and create the User."""
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must be 6 digits.")
        return value


class ResendVerificationSerializer(serializers.Serializer):
    """Resend a verification OTP (subject to cooldown)."""
    email = serializers.EmailField()


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


# ---------------------------------------------------------------------------
# Forgot password / reset
# ---------------------------------------------------------------------------

class ForgotPasswordSerializer(serializers.Serializer):
    """Request a password-reset OTP. Generic response prevents account enumeration."""
    email = serializers.EmailField()


class VerifyPasswordResetOtpSerializer(serializers.Serializer):
    """Verify the password-reset OTP. Returns a reset_token for the next step."""
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must be 6 digits.")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Set a new password after OTP verification."""
    email = serializers.EmailField()
    reset_token = serializers.CharField()  # short-lived token from verify step
    new_password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError(
                "Password must contain at least one letter."
            )
        if not re.search(r'\d', value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )
        return value

    def validate(self, data):
        if data.get('new_password') != data.get('confirm_password'):
            raise serializers.ValidationError(
                {'confirm_password': "Passwords do not match."}
            )
        return data


# ---------------------------------------------------------------------------
# Change email (authenticated)
# ---------------------------------------------------------------------------

class RequestEmailChangeSerializer(serializers.Serializer):
    """Request OTP for email change. OTP goes to the new email address."""
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email address is already in use."
            )
        return value


class VerifyEmailChangeSerializer(serializers.Serializer):
    """Verify OTP and apply the email change."""
    otp = serializers.CharField(min_length=6, max_length=6)

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must be 6 digits.")
        return value


# ---------------------------------------------------------------------------
# Change password (authenticated)
# ---------------------------------------------------------------------------

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if not re.search(r'[A-Za-z]', value):
            raise serializers.ValidationError(
                "Password must contain at least one letter."
            )
        if not re.search(r'\d', value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )
        return value

    def validate(self, data):
        if data.get('new_password') != data.get('confirm_password'):
            raise serializers.ValidationError(
                {'confirm_password': "Passwords do not match."}
            )
        return data
