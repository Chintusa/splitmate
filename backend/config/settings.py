import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'splitmate-secret-key-dev-mode-39281048')

DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'daphne',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'corsheaders',
    'channels',

    # Local apps
    'apps.accounts',
    'apps.groups',
    'apps.expenses',
    'apps.settlements',
    'apps.activity',
    'apps.dashboard',
    'apps.realtime',
    'apps.email_service',
    'apps.notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database - MySQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DATABASE_NAME', 'splitmate'),
        'USER': os.environ.get('DATABASE_USER', 'jhasa'),
        'PASSWORD': os.environ.get('DATABASE_PASSWORD', '123'),
        'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DATABASE_PORT', '3306'),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    }
}

AUTH_USER_MODEL = 'accounts.User'

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.accounts.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# CORS settings
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# JWT settings
# ---------------------------------------------------------------------------
JWT_ACCESS_MINUTES = int(os.environ.get('JWT_ACCESS_MINUTES', 15))
JWT_REFRESH_DAYS = int(os.environ.get('JWT_REFRESH_DAYS', 7))

# ---------------------------------------------------------------------------
# OTP settings
# ---------------------------------------------------------------------------
OTP_EXPIRY_MINUTES = int(os.environ.get('OTP_EXPIRY_MINUTES', 10))
OTP_MAX_ATTEMPTS = int(os.environ.get('OTP_MAX_ATTEMPTS', 5))
OTP_RESEND_COOLDOWN_SECONDS = int(os.environ.get('OTP_RESEND_COOLDOWN_SECONDS', 60))

# ---------------------------------------------------------------------------
# SMTP / Email settings
# All credentials come exclusively from environment variables.
# In development use EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
# to print emails to stdout without any SMTP server.
# ---------------------------------------------------------------------------
import sys
TESTING = 'pytest' in sys.modules or 'test' in sys.argv
EMAIL_QUEUE_SYNCHRONOUS = os.environ.get('EMAIL_QUEUE_SYNCHRONOUS', str(TESTING)).lower() in ('true', '1', 't')

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.locmem.EmailBackend' if TESTING else 'django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('SMTP_PORT', 587))
EMAIL_USE_TLS = os.environ.get('SMTP_USE_TLS', 'True').lower() in ('true', '1', 't')
EMAIL_USE_SSL = os.environ.get('SMTP_USE_SSL', 'False').lower() in ('true', '1', 't')
EMAIL_HOST_USER = os.environ.get('SMTP_USERNAME', '')
EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

_smtp_from_name = os.environ.get('SMTP_FROM_NAME', 'SplitMate')
_smtp_from_email = os.environ.get('SMTP_FROM_EMAIL', 'noreply@splitmate.app')
SMTP_FROM_EMAIL = f"{_smtp_from_name} <{_smtp_from_email}>"
DEFAULT_FROM_EMAIL = SMTP_FROM_EMAIL

# ---------------------------------------------------------------------------
# Logging — never log credentials or OTP values
# ---------------------------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'loggers': {
        'splitmate.email': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'splitmate.otp': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

APPEND_SLASH = False
