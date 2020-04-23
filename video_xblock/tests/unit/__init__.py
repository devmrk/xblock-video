"""
Unit tests for video_xblock modules.
"""
import os
from django.conf import settings

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

print("HELLO")
settings.configure(
    INSTALLED_APPS=['django_assets', 'django.contrib.staticfiles'],
    TEMPLATES=[{
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'backends'),
        ]
    }]
)
