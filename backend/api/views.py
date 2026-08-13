"""
API views. Kept thin: parse request -> delegate to services.py -> serialize.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api import services
from api.models import Category, DispenseLog, Item, Notification, StaffProfile, StockReceipt, Supplier, Unit
from api.permissions import IsManager, IsManagerOrReadOnlyForOwnEntries
from api.serializers import (
    CategorySerializer,
    CurrentStockSerializer,
    DispenseLogSerializer,
    ItemSerializer,
    NotificationSerializer,
    StaffProfileSerializer,
    StockReceiptSerializer,
    SupplierSerializer,
    UnitSerializer,
)
from api.utils import rows_to_csv


def _current_staff_profile(request):
    return getattr(request.user, "staff_profile", None)


# --------------------------------------------------------------------------
# Settings / controlled lists
# --------------------------------------------------------------------------
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsManager]


class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsManager]


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsManager]


# --------------------------------------------------------------------------
# Users / staff
# --------------------------------------------------------------------------
class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.select_related("user").all()
    serializer_class = StaffProfileSerializer
    permission_classes = [IsManager]
    filterset_fields = ["role", "department", "is_active"]
    search_fields = ["staff_id", "user__first_name", "user__last_name"]


# --------------------------------------------------------------------------
# Item Master
# --------------------------------------------------------------------------
class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("category", "unit", "supplier").all()
    serializer_class = ItemSerializer
    permission_classes = [IsManagerOrReadOnlyForOwnEntries]
    lookup_field = "item_code"
    filterset_fields = ["category", "is_active"]
    search_fields = ["item_code", "item_name", "storage_location"]

    def perform_create(self, serializer):
        from api.utils import generate_item_code

        serializer.save(item_code=generate_item_code(Item))

    @action(detail=True, methods=["post"])
    def deactivate(self, request, item_code=None):
        item = self.get_object()
        item.is_active = False
        item.save(update_fields=["is_active"])
        services.log_audit(_current_staff_profile(request), "deactivate", "Item", item.item_code)
        return Response(self.get_serializer(item).data)


# --------------------------------------------------------------------------
# Stock Receipts
# --------------------------------------------------------------------------
class StockReceiptViewSet(viewsets.ModelViewSet):
    queryset = StockReceipt.objects.select_related("item", "supplier", "received_by").all()
    serializer_class = StockReceiptSerializer
    permission_classes = [IsManagerOrReadOnlyForOwnEntries]
    filterset_fields = ["item", "supplier", "date"]
    search_fields = ["receipt_id", "batch_lot"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.validated_data.pop("item")
        try:
            receipt = services.create_stock_receipt(
                item=item,
                staff_profile=_current_staff_profile(request),
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message) from exc
        return Response(self.get_serializer(receipt).data, status=status.HTTP_201_CREATED)


# --------------------------------------------------------------------------
# Dispensing Log
# --------------------------------------------------------------------------
class DispenseLogViewSet(viewsets.ModelViewSet):
    queryset = DispenseLog.objects.select_related("item", "dispensed_by").all()
    serializer_class = DispenseLogSerializer
    permission_classes = [IsManagerOrReadOnlyForOwnEntries]
    filterset_fields = ["item", "date", "recipient_department"]
    search_fields = ["dispense_id", "batch_lot", "purpose"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.validated_data.pop("item")
        try:
            dispense = services.create_dispense_log(
                item=item,
                staff_profile=_current_staff_profile(request),
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message) from exc
        return Response(self.get_serializer(dispense).data, status=status.HTTP_201_CREATED)


# --------------------------------------------------------------------------
# Current Stock (computed, read-only)
# --------------------------------------------------------------------------
class CurrentStockView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_only = request.query_params.get("active_only", "true").lower() != "false"
        rows = services.get_current_stock(active_only=active_only)
        serializer = CurrentStockSerializer(rows, many=True)
        return Response(serializer.data)


# --------------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------------
class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(services.get_dashboard_data())


# --------------------------------------------------------------------------
# Reports
# --------------------------------------------------------------------------
class LowStockReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = services.get_low_stock_report()
        if request.query_params.get("format") == "csv":
            fieldnames = list(rows[0].keys()) if rows else []
            buffer = rows_to_csv(fieldnames, rows)
            response = HttpResponse(buffer.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="low_stock_report.csv"'
            return response
        return Response(rows)


class ExpiryWatchReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        window_days = request.query_params.get("window_days")
        rows = services.get_expiry_watch_report(int(window_days) if window_days else None)
        return Response(rows)


# --------------------------------------------------------------------------
# Notifications (flash notifications for the frontend)
# --------------------------------------------------------------------------
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = _current_staff_profile(self.request)
        from django.db.models import Q

        qs = Notification.objects.all()
        if profile:
            qs = qs.filter(Q(recipient=profile) | Q(recipient__isnull=True))
        return qs

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(self.get_serializer(notification).data)