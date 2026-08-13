"""
Business logic layer.

Views should stay thin (parse request -> call a service -> serialize
response). All the rules that used to live in Excel formulas and the
"Future VBA Hook" table on the Settings sheet live here instead:

    ValidateReceiptEntry   -> validate_receipt()
    ValidateDispenseEntry  -> validate_dispense()
    RefreshDashboard       -> refresh_all_snapshots(), get_dashboard_data()
    ExportLowStockReport   -> get_low_stock_report()
    UserAuditStamp         -> handled in signals.py, calls log_audit() here
"""
from datetime import date, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from api.models import (
    AuditLog,
    DispenseLog,
    Item,
    Notification,
    StockReceipt,
    StockSnapshot,
)
from api.utils import (
    calculate_stock_status,
    days_until_expiry,
    generate_dispense_id,
    generate_receipt_id,
    is_within_expiry_window,
)


# --------------------------------------------------------------------------
# Validation (ValidateReceiptEntry / ValidateDispenseEntry hooks)
# --------------------------------------------------------------------------
def validate_receipt(item: Item, quantity_received: int):
    if not item.is_active:
        raise ValidationError(f"Cannot receive stock for inactive item {item.item_code}.")
    if quantity_received <= 0:
        raise ValidationError("Quantity received must be greater than zero.")


def validate_dispense(item: Item, quantity_dispensed: int):
    if not item.is_active:
        raise ValidationError(f"Cannot dispense inactive item {item.item_code}.")
    if quantity_dispensed <= 0:
        raise ValidationError("Quantity dispensed must be greater than zero.")

    available = get_available_quantity(item)
    if quantity_dispensed > available:
        raise ValidationError(
            f"Cannot dispense {quantity_dispensed} units of {item.item_code}; "
            f"only {available} available."
        )


# --------------------------------------------------------------------------
# Core stock calculation (Current Stock sheet logic)
# --------------------------------------------------------------------------
def get_total_received(item: Item) -> int:
    return item.receipts.aggregate(total=Sum("quantity_received"))["total"] or 0


def get_total_dispensed(item: Item) -> int:
    return item.dispenses.aggregate(total=Sum("quantity_dispensed"))["total"] or 0


def get_available_quantity(item: Item) -> int:
    return get_total_received(item) - get_total_dispensed(item)


def get_earliest_expiry(item: Item):
    receipt = (
        item.receipts.filter(expiry_date__isnull=False, expiry_date__gte=date.today())
        .order_by("expiry_date")
        .first()
    )
    return receipt.expiry_date if receipt else None


def compute_current_stock_row(item: Item) -> dict:
    """Equivalent of one row on the 'Current Stock' sheet."""
    total_received = get_total_received(item)
    total_dispensed = get_total_dispensed(item)
    available = total_received - total_dispensed
    status = calculate_stock_status(available, item.minimum_stock_level)
    return {
        "item_code": item.item_code,
        "item_name": item.item_name,
        "category": item.category.name,
        "unit": item.unit.name,
        "minimum_stock_level": item.minimum_stock_level,
        "total_received": total_received,
        "total_dispensed": total_dispensed,
        "available_quantity": available,
        "stock_status": status,
        "reorder_quantity": item.reorder_quantity if status != "OK" else None,
        "earliest_expiry": get_earliest_expiry(item),
    }


def get_current_stock(active_only: bool = True) -> list[dict]:
    items = Item.objects.select_related("category", "unit")
    if active_only:
        items = items.filter(is_active=True)
    return [compute_current_stock_row(item) for item in items]


# --------------------------------------------------------------------------
# Snapshot cache (refreshed by job_scheduler.py, mirrors RefreshDashboard)
# --------------------------------------------------------------------------
def refresh_snapshot(item: Item) -> StockSnapshot:
    row = compute_current_stock_row(item)
    snapshot, _ = StockSnapshot.objects.update_or_create(
        item=item,
        defaults={
            "total_received": row["total_received"],
            "total_dispensed": row["total_dispensed"],
            "available_quantity": row["available_quantity"],
            "status": row["stock_status"],
            "earliest_expiry": row["earliest_expiry"],
        },
    )
    return snapshot


def refresh_all_snapshots() -> int:
    count = 0
    for item in Item.objects.filter(is_active=True):
        refresh_snapshot(item)
        count += 1
    return count


# --------------------------------------------------------------------------
# Transactions: create receipt / dispense (with audit + notification)
# --------------------------------------------------------------------------
@transaction.atomic
def create_stock_receipt(*, item: Item, staff_profile, **fields) -> StockReceipt:
    validate_receipt(item, fields["quantity_received"])
    receipt = StockReceipt.objects.create(
        receipt_id=generate_receipt_id(StockReceipt),
        item=item,
        received_by=staff_profile,
        created_by=staff_profile,
        **fields,
    )
    refresh_snapshot(item)
    log_audit(staff_profile, "create", "StockReceipt", receipt.receipt_id)
    return receipt


@transaction.atomic
def create_dispense_log(*, item: Item, staff_profile, **fields) -> DispenseLog:
    validate_dispense(item, fields["quantity_dispensed"])
    dispense = DispenseLog.objects.create(
        dispense_id=generate_dispense_id(DispenseLog),
        item=item,
        dispensed_by=staff_profile,
        created_by=staff_profile,
        **fields,
    )
    snapshot = refresh_snapshot(item)
    log_audit(staff_profile, "create", "DispenseLog", dispense.dispense_id)

    if snapshot.status in (StockSnapshot.Status.LOW_STOCK, StockSnapshot.Status.OUT_OF_STOCK):
        notify_low_stock(item, snapshot)

    return dispense


# --------------------------------------------------------------------------
# Notifications (flash notifications surfaced in the frontend)
# --------------------------------------------------------------------------
def notify_low_stock(item: Item, snapshot: StockSnapshot):
    Notification.objects.create(
        recipient=None,  # broadcast to all staff
        message=f"{item.item_code} ({item.item_name}) is now {snapshot.status}: "
        f"{snapshot.available_quantity} remaining, minimum {item.minimum_stock_level}.",
        level="warning" if snapshot.status == StockSnapshot.Status.LOW_STOCK else "error",
    )


def notify_expiring_batches(rows: list[dict]):
    if not rows:
        return
    Notification.objects.create(
        recipient=None,
        message=f"{len(rows)} batch(es) expiring within "
        f"{settings.EXPIRY_WATCH_WINDOW_DAYS} days. Check the Expiry Watch report.",
        level="warning",
    )


# --------------------------------------------------------------------------
# Dashboard aggregation (Dashboard sheet)
# --------------------------------------------------------------------------
def get_dashboard_data() -> dict:
    stock_rows = get_current_stock()

    total_active_items = Item.objects.filter(is_active=True).count()
    low_stock_items = [r for r in stock_rows if r["stock_status"] == "Low Stock"]
    out_of_stock_items = [r for r in stock_rows if r["stock_status"] == "Out of Stock"]

    since = timezone.now() - timedelta(days=30)
    recent_transactions = DispenseLog.objects.filter(created_at__gte=since).count()

    reorder_watchlist = [
        {
            "item_code": r["item_code"],
            "item_name": r["item_name"],
            "available": r["available_quantity"],
            "minimum": r["minimum_stock_level"],
            "status": r["stock_status"],
        }
        for r in stock_rows
        if r["stock_status"] != "OK"
    ]

    status_counts = {"OK": 0, "Low Stock": 0, "Out of Stock": 0}
    for r in stock_rows:
        status_counts[r["stock_status"]] += 1
    total = len(stock_rows) or 1
    status_summary = [
        {"status": status, "count": count, "share": round(count / total, 6)}
        for status, count in status_counts.items()
    ]

    category_totals = {}
    for item in Item.objects.select_related("category"):
        cat = item.category.name
        category_totals.setdefault(cat, {"received": 0, "dispensed": 0})
        category_totals[cat]["received"] += get_total_received(item)
        category_totals[cat]["dispensed"] += get_total_dispensed(item)
    category_summary = [
        {"category": cat, **totals} for cat, totals in sorted(category_totals.items())
    ]

    recent_dispensing = (
        DispenseLog.objects.select_related("item", "dispensed_by")
        .order_by("-date")[:10]
        .values(
            "date",
            "dispense_id",
            "item__item_code",
            "quantity_dispensed",
            "item__item_name",
            "dispensed_by__user__first_name",
            "recipient_department",
            "remarks",
        )
    )

    return {
        "kpis": {
            "total_active_items": total_active_items,
            "low_stock_items": len(low_stock_items),
            "out_of_stock_items": len(out_of_stock_items),
            "recent_transactions_30_days": recent_transactions,
        },
        "reorder_watchlist": reorder_watchlist,
        "status_summary": status_summary,
        "category_summary": category_summary,
        "recent_dispensing": list(recent_dispensing),
    }


# --------------------------------------------------------------------------
# Reports
# --------------------------------------------------------------------------
def get_low_stock_report() -> list[dict]:
    return [
        row for row in get_current_stock() if row["stock_status"] in ("Low Stock", "Out of Stock")
    ]


def get_expiry_watch_report(window_days: int = None) -> list[dict]:
    window_days = window_days or settings.EXPIRY_WATCH_WINDOW_DAYS
    rows = []
    for receipt in StockReceipt.objects.select_related("item").filter(
        expiry_date__isnull=False
    ):
        if is_within_expiry_window(receipt.expiry_date, window_days):
            rows.append(
                {
                    "item_code": receipt.item.item_code,
                    "item_name": receipt.item.item_name,
                    "batch_lot": receipt.batch_lot,
                    "expiry_date": receipt.expiry_date,
                    "days_remaining": days_until_expiry(receipt.expiry_date),
                }
            )
    return sorted(rows, key=lambda r: r["expiry_date"])


# --------------------------------------------------------------------------
# Audit (UserAuditStamp hook)
# --------------------------------------------------------------------------
def log_audit(staff_profile, action: str, target_model: str, target_id: str, details=None):
    AuditLog.objects.create(
        user=staff_profile.user if staff_profile else None,
        action=action,
        target_model=target_model,
        target_id=str(target_id),
        details=details or {},
    )