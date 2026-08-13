from django.contrib import admin

from api.models import (
    AuditLog,
    Category,
    DispenseLog,
    Item,
    Notification,
    StaffProfile,
    StockReceipt,
    StockSnapshot,
    Supplier,
    Unit,
)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("item_code", "item_name", "category", "unit", "minimum_stock_level", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("item_code", "item_name")


@admin.register(StockReceipt)
class StockReceiptAdmin(admin.ModelAdmin):
    list_display = ("receipt_id", "date", "item", "quantity_received", "received_by")
    list_filter = ("date",)
    search_fields = ("receipt_id", "batch_lot")


@admin.register(DispenseLog)
class DispenseLogAdmin(admin.ModelAdmin):
    list_display = ("dispense_id", "date", "item", "quantity_dispensed", "dispensed_by")
    list_filter = ("date", "recipient_department")
    search_fields = ("dispense_id", "batch_lot")


@admin.register(StockSnapshot)
class StockSnapshotAdmin(admin.ModelAdmin):
    list_display = ("item", "available_quantity", "status", "refreshed_at")
    list_filter = ("status",)


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ("staff_id", "user", "role", "department", "is_active")
    list_filter = ("role", "department", "is_active")


admin.site.register(Category)
admin.site.register(Unit)
admin.site.register(Supplier)
admin.site.register(Notification)
admin.site.register(AuditLog)