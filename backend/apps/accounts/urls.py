from django.urls import re_path
from apps.accounts import views

urlpatterns = [
    # --- Registration (email-verified 2-step) ---
    re_path(r'^/register/?$',            views.register),
    re_path(r'^/verify-email/?$',         views.verify_email),
    re_path(r'^/resend-verification/?$',  views.resend_verification),

    # --- Session ---
    re_path(r'^/login/?$',   views.login),
    re_path(r'^/refresh/?$', views.refresh),
    re_path(r'^/logout/?$',  views.logout),
    re_path(r'^/me/?$',      views.me),

    # --- Forgot / reset password (public) ---
    re_path(r'^/forgot-password/?$',        views.forgot_password),
    re_path(r'^/verify-password-reset/?$',  views.verify_password_reset_otp),
    re_path(r'^/reset-password/?$',         views.reset_password),

    # --- Account management (authenticated) ---
    re_path(r'^/change-email/?$',         views.request_email_change),
    re_path(r'^/verify-email-change/?$',  views.verify_email_change),
    re_path(r'^/change-password/?$',      views.change_password),
]
