"""
Signal handlers — the "UserAuditStamp" hook from the Settings sheet.

Note: StockReceipt/DispenseLog creation is normally done through
services.create_stock_receipt() / create_dispense_log(), which already
handle snapshot refresh + audit logging explicitly. These signals are a
safety net for any writes that happen outside that path (e.g. Django admin,
data migrations, bulk imports).
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from api.models import DispenseLog, Item, StockReceipt


@receiver(post_save, sender=StockReceipt)
def refresh_snapshot_on_receipt(sender, instance, **kwargs):
    from api.services import refresh_snapshot

    refresh_snapshot(instance.item)


@receiver(post_save, sender=DispenseLog)
def refresh_snapshot_on_dispense(sender, instance, **kwargs):
    from api.services import notify_low_stock, refresh_snapshot
    from api.models import StockSnapshot

    snapshot = refresh_snapshot(instance.item)
    if snapshot.status != StockSnapshot.Status.OK:
        notify_low_stock(instance.item, snapshot)


@receiver(post_save, sender=Item)
def create_snapshot_for_new_item(sender, instance, created, **kwargs):
    if created:
        from api.services import refresh_snapshot

        refresh_snapshot(instance)