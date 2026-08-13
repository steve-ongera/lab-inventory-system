"""
Main URL configuration.

Everything API-related lives under /api/, delegated to the single
`api` application. Only Django admin sits outside that app.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]