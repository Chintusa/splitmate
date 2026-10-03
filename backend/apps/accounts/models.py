from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, name=name)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None):
        user = self.create_user(email=email, name=name, password=password)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return f"{self.name} ({self.email})"


class RefreshToken(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    token_hash = models.CharField(max_length=128, db_index=True)
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RefreshToken({self.user.email}, revoked={self.revoked})"


class OTPPurpose(models.TextChoices):
    """Enum of all valid OTP purposes. An OTP may ONLY be consumed for its original purpose."""
    EMAIL_VERIFICATION = 'EMAIL_VERIFICATION', 'Email Verification'
    PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
    CHANGE_EMAIL = 'CHANGE_EMAIL', 'Change Email'
    CHANGE_PASSWORD = 'CHANGE_PASSWORD', 'Change Password'


class OTPStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    CONSUMED = 'CONSUMED', 'Consumed'
    EXPIRED = 'EXPIRED', 'Expired'
    INVALIDATED = 'INVALIDATED', 'Invalidated'


class OTPRecord(models.Model):
    """
    Secure OTP record.

    Security properties:
    - otp_hash  : HMAC-SHA256 of the raw OTP — raw value is NEVER stored.
    - purpose   : Must match at verification time — cross-purpose reuse is rejected.
    - attempt_count / max_attempts : Brute-force protection.
    - expires_at : Server-side expiry — frontend expiry is informational only.
    - status    : Explicit state machine — consumed/expired/invalidated records are rejected.
    - user / email: Bound to a specific identity — cross-user reuse is rejected.

    The `user` FK is nullable to support pre-registration flows (email verification
    before the User row exists). For those flows only `email` is populated.
    The `pending_name` and `pending_password_hash` carry the registration data
    until the User is created on successful verification.
    """
    id = models.BigAutoField(primary_key=True)

    # Identity binding — at least one must be set
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='otp_records',
        null=True,
        blank=True,
        db_index=True,
    )
    email = models.EmailField(max_length=255, db_index=True)

    purpose = models.CharField(
        max_length=32,
        choices=OTPPurpose.choices,
        db_index=True,
    )

    # OTP is stored as HMAC-SHA256; the raw value is never persisted
    otp_hash = models.CharField(max_length=128)

    status = models.CharField(
        max_length=16,
        choices=OTPStatus.choices,
        default=OTPStatus.PENDING,
        db_index=True,
    )

    attempt_count = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)

    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    consumed_at = models.DateTimeField(null=True, blank=True)

    # Pre-registration payload (only for EMAIL_VERIFICATION before user creation)
    pending_name = models.CharField(max_length=255, blank=True, default='')
    pending_password_hash = models.CharField(max_length=255, blank=True, default='')

    # For CHANGE_EMAIL: the new email address being requested
    new_email = models.EmailField(max_length=255, blank=True, default='')

    class Meta:
        indexes = [
            models.Index(fields=['email', 'purpose', 'status']),
            models.Index(fields=['user', 'purpose', 'status']),
            models.Index(fields=['expires_at', 'status']),
        ]

    def __str__(self):
        uid = self.user_id or 'pre-reg'
        return f"OTPRecord(user={uid}, purpose={self.purpose}, status={self.status})"

    @property
    def is_pending(self) -> bool:
        return self.status == OTPStatus.PENDING

    @property
    def attempts_remaining(self) -> int:
        return max(0, self.max_attempts - self.attempt_count)
