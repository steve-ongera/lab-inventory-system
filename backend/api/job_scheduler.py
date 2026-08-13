"""
Background job scheduler.

Turns the workbook's manual/VBA triggers into real scheduled jobs:

    RefreshDashboard (Workbook_Open)  -> refresh_dashboard_snapshots(), daily + on demand
    Low-stock monitoring              -> scan_low_stock(), daily
    Expiry Watch (90-day window)      -> scan_expiring_batches(), daily

Uses APScheduler with the Django job store (django-apscheduler) so jobs
survive process restarts and are visible/auditable from the Django admin.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from django.conf import settings
from django_apscheduler.jobstores import DjangoJobStore, register_events, register_job

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone=str(settings.TIME_ZONE))
scheduler.add_jobstore(DjangoJobStore(), "default")


@register_job(scheduler, CronTrigger(hour=settings.LOW_STOCK_SCAN_HOUR, minute=0))
def scan_low_stock():
    """Daily low-stock / out-of-stock scan; raises a Notification per item that needs it."""
    from api import services
    from api.models import Item, StockSnapshot

    flagged = 0
    for item in Item.objects.filter(is_active=True):
        snapshot = services.refresh_snapshot(item)
        if snapshot.status != StockSnapshot.Status.OK:
            services.notify_low_stock(item, snapshot)
            flagged += 1
    logger.info("scan_low_stock: flagged %s item(s)", flagged)
    return flagged


@register_job(scheduler, CronTrigger(hour=settings.LOW_STOCK_SCAN_HOUR, minute=15))
def scan_expiring_batches():
    """Daily expiry watch — batches expiring within EXPIRY_WATCH_WINDOW_DAYS."""
    from api import services

    rows = services.get_expiry_watch_report()
    services.notify_expiring_batches(rows)
    logger.info("scan_expiring_batches: %s batch(es) in window", len(rows))
    return len(rows)


@register_job(scheduler, CronTrigger(minute="*/30"))
def refresh_dashboard_snapshots():
    """Refresh the StockSnapshot cache every 30 minutes so /api/dashboard/ stays fast."""
    from api import services

    count = services.refresh_all_snapshots()
    logger.info("refresh_dashboard_snapshots: refreshed %s item(s)", count)
    return count


def start_scheduler():
    """Called once from apiConfig.ready()."""
    if scheduler.running:
        return
    register_events(scheduler)
    scheduler.start()
    logger.info("Inventory job scheduler started.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Inventory job scheduler stopped.")