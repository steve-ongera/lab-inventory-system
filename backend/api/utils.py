"""
Small, dependency-free helper functions used across services.py and views.py.
"""
import csv
import io
from datetime import date, timedelta

from django.conf import settings


# --------------------------------------------------------------------------
# ID generators — mirrors the workbook's LAB-###, REC-####, DIS-#### codes
# --------------------------------------------------------------------------
def generate_next_code(model, field_name: str, prefix: str, pad: int = 4) -> str:
    """
    Generate the next sequential code for a model, e.g. REC-0013 following
    REC-0012. Falls back to <prefix>-{pad zeros}1 if the table is empty.
    """
    last = (
        model.objects.filter(**{f"{field_name}__startswith": f"{prefix}-"})
        .order_by(f"-{field_name}")
        .values_list(field_name, flat=True)
        .first()
    )
    if not last:
        next_number = 1
    else:
        try:
            next_number = int(last.split("-")[-1]) + 1
        except ValueError:
            next_number = 1
    return f"{prefix}-{str(next_number).zfill(pad)}"


def generate_item_code(model, field_name: str = "item_code") -> str:
    return generate_next_code(model, field_name, prefix="LAB", pad=3)


def generate_receipt_id(model) -> str:
    return generate_next_code(model, "receipt_id", prefix="REC", pad=4)


def generate_dispense_id(model) -> str:
    return generate_next_code(model, "dispense_id", prefix="DIS", pad=4)


# --------------------------------------------------------------------------
# Stock status calculator (Settings sheet: OK / Low Stock / Out of Stock)
# --------------------------------------------------------------------------
def calculate_stock_status(available_quantity: int, minimum_stock_level: int) -> str:
    if available_quantity <= 0:
        return "Out of Stock"
    if available_quantity <= minimum_stock_level:
        return "Low Stock"
    return "OK"


# --------------------------------------------------------------------------
# Expiry helpers
# --------------------------------------------------------------------------
def is_within_expiry_window(expiry_date, window_days: int = None) -> bool:
    if not expiry_date:
        return False
    window_days = window_days or getattr(settings, "EXPIRY_WATCH_WINDOW_DAYS", 90)
    return date.today() <= expiry_date <= date.today() + timedelta(days=window_days)


def days_until_expiry(expiry_date) -> int | None:
    if not expiry_date:
        return None
    return (expiry_date - date.today()).days


# --------------------------------------------------------------------------
# CSV export (ExportLowStockReport hook)
# --------------------------------------------------------------------------
def rows_to_csv(fieldnames: list[str], rows: list[dict]) -> io.StringIO:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    buffer.seek(0)
    return buffer