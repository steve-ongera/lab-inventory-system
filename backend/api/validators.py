"""
Field-level validators shared by serializers/forms.
Business-rule validation (e.g. dispense <= available stock) lives in
services.py instead, since it needs to query other records.
"""
from datetime import date

from django.core.exceptions import ValidationError


def validate_not_future_date(value: date):
    if value and value > date.today():
        raise ValidationError("Date cannot be in the future.")


def validate_positive_quantity(value: int):
    if value is None or value <= 0:
        raise ValidationError("Quantity must be greater than zero.")


def validate_expiry_after_receipt(receipt_date: date, expiry_date: date):
    if expiry_date and receipt_date and expiry_date < receipt_date:
        raise ValidationError("Expiry date cannot be earlier than the receipt date.")