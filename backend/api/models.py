"""
Models for the Laboratory Inventory Management System.

Mapping back to the source workbook:
    Item Master      -> Item
    Stock Receipts   -> StockReceipt
    Dispensing Log   -> DispenseLog
    Current Stock    -> NOT a table; computed in services.py (formula-driven,
                         same as the spreadsheet) and optionally cached in
                         StockSnapshot for fast dashboard reads.
    Settings         -> Category, Unit, Supplier
    Users            -> StaffProfile
"""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class TimeStampedModel(models.Model):
    """Adds UserAuditStamp-style created/updated tracking (see Settings sheet)."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "inventory.StaffProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        abstract = True


# --------------------------------------------------------------------------
# Controlled lists (Settings sheet)
# --------------------------------------------------------------------------
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Unit(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=150, unique=True)
    contact_info = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# --------------------------------------------------------------------------
# Staff directory (Users sheet)
# --------------------------------------------------------------------------
class StaffProfile(models.Model):
    class Role(models.TextChoices):
        MANAGER = "Manager", "Manager"
        TECHNOLOGIST = "Technologist", "Technologist"
        ADMIN = "Admin", "Admin"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="staff_profile"
    )
    staff_id = models.CharField(max_length=20, unique=True)  # e.g. USR001
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TECHNOLOGIST)
    department = models.CharField(max_length=100, default="Laboratory")
    phone = models.CharField(max_length=30, blank=True)
    signature_initials = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["staff_id"]

    def __str__(self):
        return f"{self.staff_id} - {self.user.get_full_name() or self.user.username}"


# --------------------------------------------------------------------------
# Item Master
# --------------------------------------------------------------------------
class Item(models.Model):
    item_code = models.CharField(max_length=20, unique=True)  # e.g. LAB-001
    item_name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="items")
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name="items")
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="items"
    )
    minimum_stock_level = models.PositiveIntegerField(default=0)
    reorder_quantity = models.PositiveIntegerField(default=0)
    storage_location = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["item_code"]

    def __str__(self):
        return f"{self.item_code} - {self.item_name}"


# --------------------------------------------------------------------------
# Stock Receipts
# --------------------------------------------------------------------------
class StockReceipt(TimeStampedModel):
    receipt_id = models.CharField(max_length=20, unique=True, editable=False)  # REC-####
    date = models.DateField()
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="receipts")
    batch_lot = models.CharField(max_length=50)
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="receipts"
    )
    quantity_received = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    received_by = models.ForeignKey(
        StaffProfile, on_delete=models.SET_NULL, null=True, related_name="receipts_logged"
    )
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-receipt_id"]

    def __str__(self):
        return self.receipt_id


# --------------------------------------------------------------------------
# Dispensing Log
# --------------------------------------------------------------------------
class DispenseLog(TimeStampedModel):
    dispense_id = models.CharField(max_length=20, unique=True, editable=False)  # DIS-####
    date = models.DateField()
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="dispenses")
    batch_lot = models.CharField(max_length=50, blank=True)
    quantity_dispensed = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    dispensed_by = models.ForeignKey(
        StaffProfile, on_delete=models.SET_NULL, null=True, related_name="dispenses_logged"
    )
    recipient_department = models.CharField(max_length=150, blank=True)
    purpose = models.CharField(max_length=255, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-dispense_id"]

    def __str__(self):
        return self.dispense_id


# --------------------------------------------------------------------------
# Cached "Current Stock" snapshot — optional performance cache.
# The authoritative calculation always lives in services.py; this table is
# refreshed by job_scheduler.py so the dashboard doesn't recompute on every
# request (mirrors the workbook's RefreshDashboard hook).
# --------------------------------------------------------------------------
class StockSnapshot(models.Model):
    class Status(models.TextChoices):
        OK = "OK", "OK"
        LOW_STOCK = "Low Stock", "Low Stock"
        OUT_OF_STOCK = "Out of Stock", "Out of Stock"

    item = models.OneToOneField(Item, on_delete=models.CASCADE, related_name="snapshot")
    total_received = models.PositiveIntegerField(default=0)
    total_dispensed = models.PositiveIntegerField(default=0)
    available_quantity = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OK)
    earliest_expiry = models.DateField(null=True, blank=True)
    refreshed_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.item.item_code}: {self.available_quantity} ({self.status})"


# --------------------------------------------------------------------------
# Notifications (flash notifications consumed by the frontend)
# --------------------------------------------------------------------------
class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = "info", "Info"
        SUCCESS = "success", "Success"
        WARNING = "warning", "Warning"
        ERROR = "error", "Error"

    recipient = models.ForeignKey(
        StaffProfile, on_delete=models.CASCADE, related_name="notifications",
        null=True, blank=True,  # null = broadcast to all staff
    )
    message = models.CharField(max_length=255)
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.INFO)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.level}] {self.message[:50]}"


# --------------------------------------------------------------------------
# Audit log (UserAuditStamp hook)
# --------------------------------------------------------------------------
class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    action = models.CharField(max_length=50)  # e.g. "create", "update", "delete"
    target_model = models.CharField(max_length=100)
    target_id = models.CharField(max_length=50)
    details = models.JSONField(blank=True, default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.action} {self.target_model}#{self.target_id} by {self.user}"