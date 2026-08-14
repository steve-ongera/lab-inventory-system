from django.contrib.auth.models import User
from rest_framework import serializers

from api.models import (
    AuditLog,
    Category,
    DispenseLog,
    Item,
    Notification,
    StaffProfile,
    StockReceipt,
    Supplier,
    Unit,
)


# --------------------------------------------------------------------------
# Settings / controlled lists
# --------------------------------------------------------------------------
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ["id", "name"]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "contact_info"]


# --------------------------------------------------------------------------
# Users / staff
# --------------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]
        read_only_fields = ["id"]


class StaffProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "user",
            "staff_id",
            "full_name",
            "role",
            "department",
            "phone",
            "signature_initials",
            "is_active",
            "remarks",
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        user = User.objects.create(**user_data)
        return StaffProfile.objects.create(user=user, **validated_data)


# --------------------------------------------------------------------------
# Item Master
# --------------------------------------------------------------------------
class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True, default=None)

    class Meta:
        model = Item
        fields = [
            "id",
            "item_code",
            "item_name",
            "category",
            "category_name",
            "unit",
            "unit_name",
            "supplier",
            "supplier_name",
            "minimum_stock_level",
            "reorder_quantity",
            "storage_location",
            "is_active",
            "remarks",
        ]
        read_only_fields = ["item_code"]


# --------------------------------------------------------------------------
# Stock Receipts
# --------------------------------------------------------------------------
class StockReceiptSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.item_name", read_only=True)
    received_by_name = serializers.CharField(
        source="received_by.user.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "receipt_id",
            "date",
            "item",
            "item_name",
            "batch_lot",
            "expiry_date",
            "supplier",
            "quantity_received",
            "unit_cost",
            "received_by",
            "received_by_name",
            "remarks",
            "created_at",
        ]
        read_only_fields = ["receipt_id", "created_at"]


# --------------------------------------------------------------------------
# Dispensing Log
# --------------------------------------------------------------------------
class DispenseLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.item_name", read_only=True)
    dispensed_by_name = serializers.CharField(
        source="dispensed_by.user.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = DispenseLog
        fields = [
            "id",
            "dispense_id",
            "date",
            "item",
            "item_name",
            "batch_lot",
            "quantity_dispensed",
            "dispensed_by",
            "dispensed_by_name",
            "recipient_department",
            "purpose",
            "remarks",
            "created_at",
        ]
        read_only_fields = ["dispense_id", "created_at"]


# --------------------------------------------------------------------------
# Current Stock (computed, read-only — matches services.compute_current_stock_row)
# --------------------------------------------------------------------------
class CurrentStockSerializer(serializers.Serializer):
    item_code = serializers.CharField()
    item_name = serializers.CharField()
    category = serializers.CharField()
    unit = serializers.CharField()
    minimum_stock_level = serializers.IntegerField()
    total_received = serializers.IntegerField()
    total_dispensed = serializers.IntegerField()
    available_quantity = serializers.IntegerField()
    stock_status = serializers.CharField()
    reorder_quantity = serializers.IntegerField(allow_null=True)
    earliest_expiry = serializers.DateField(allow_null=True)


# --------------------------------------------------------------------------
# Notifications
# --------------------------------------------------------------------------
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "message", "level", "is_read", "created_at"]


# --------------------------------------------------------------------------
# Audit log (read-only, admin/reporting use)
# --------------------------------------------------------------------------
class AuditLogSerializer(serializers.ModelSerializer):
    user_display = serializers.CharField(source="user.get_full_name", default=None, read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "user", "user_display", "action", "target_model", "target_id", "details", "timestamp"]
