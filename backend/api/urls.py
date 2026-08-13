from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from api import views

router = DefaultRouter()
router.register(r"items", views.ItemViewSet, basename="item")
router.register(r"stock-receipts", views.StockReceiptViewSet, basename="stock-receipt")
router.register(r"dispensing-log", views.DispenseLogViewSet, basename="dispense-log")
router.register(r"users", views.StaffProfileViewSet, basename="staff-profile")
router.register(r"notifications", views.NotificationViewSet, basename="notification")
router.register(r"settings/categories", views.CategoryViewSet, basename="category")
router.register(r"settings/units", views.UnitViewSet, basename="unit")
router.register(r"settings/suppliers", views.SupplierViewSet, basename="supplier")

urlpatterns = [
    # Auth
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Computed views
    path("current-stock/", views.CurrentStockView.as_view(), name="current-stock"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    # Reports
    path("reports/low-stock/", views.LowStockReportView.as_view(), name="low-stock-report"),
    path("reports/expiry-watch/", views.ExpiryWatchReportView.as_view(), name="expiry-watch-report"),
    # Routed viewsets
    path("", include(router.urls)),
]