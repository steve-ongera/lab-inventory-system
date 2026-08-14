"""
Seed the database with ~4 months of realistic laboratory inventory activity:
categories, units, suppliers, staff, an item master list, and a running
history of stock receipts + dispenses — generated week by week so stock
levels move up and down naturally (and some items genuinely drift into
Low Stock / Out of Stock, so the dashboard has something real to show).

Usage:
    python manage.py seed_data
    python manage.py seed_data --months 4 --flush
    python manage.py seed_data --months 6 --seed 42
"""
import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from api import services
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

CATEGORIES = ["Reagents", "Glassware", "Consumables", "Safety Equipment", "Media & Reagent Kits", "Equipment"]

UNITS = ["Bottle", "Box", "Pack", "Piece", "Liter", "Kg", "Roll", "Vial"]

SUPPLIERS = [
    ("MedLab Supplies Ltd", "orders@medlabsupplies.co.ke"),
    ("BioReagent Africa", "sales@bioreagentafrica.com"),
    ("Kilifi Scientific Distributors", "info@kilifiscientific.co.ke"),
    ("PanAfrica Labware Co.", "contact@panafricalabware.com"),
    ("Coastal Diagnostics Supply", "support@coastaldiagnostics.co.ke"),
]

STAFF = [
    ("jkamau", "James", "Kamau", StaffProfile.Role.MANAGER, "USR001"),
    ("amwangi", "Alice", "Mwangi", StaffProfile.Role.TECHNOLOGIST, "USR002"),
    ("bomondi", "Brian", "Omondi", StaffProfile.Role.TECHNOLOGIST, "USR003"),
    ("fnjeri", "Faith", "Njeri", StaffProfile.Role.TECHNOLOGIST, "USR004"),
    ("skarisa", "Sarah", "Karisa", StaffProfile.Role.ADMIN, "USR005"),
    ("dmwakio", "David", "Mwakio", StaffProfile.Role.TECHNOLOGIST, "USR006"),
]

# (item_name, category, unit, min_stock, reorder_qty, storage_location, base_unit_cost)
ITEMS = [
    ("Sodium Chloride 0.9% Saline", "Reagents", "Bottle", 30, 60, "Reagent Cabinet A1", 250),
    ("Ethanol 95%", "Reagents", "Liter", 15, 30, "Flammables Cabinet", 900),
    ("Formalin 10% Buffered", "Reagents", "Bottle", 20, 40, "Reagent Cabinet A2", 400),
    ("Glacial Acetic Acid", "Reagents", "Bottle", 10, 20, "Acid Cabinet", 600),
    ("Giemsa Stain", "Reagents", "Bottle", 12, 24, "Staining Room", 750),
    ("Gram Stain Kit", "Media & Reagent Kits", "Pack", 10, 20, "Microbiology Store", 1800),
    ("Blood Culture Bottles", "Consumables", "Box", 20, 40, "Cold Room B", 3200),
    ("Petri Dishes (Disposable)", "Consumables", "Pack", 25, 50, "Consumables Shelf 1", 850),
    ("Microscope Slides", "Consumables", "Box", 30, 60, "Consumables Shelf 2", 400),
    ("Cover Slips", "Consumables", "Box", 30, 60, "Consumables Shelf 2", 300),
    ("Disposable Syringes 5ml", "Consumables", "Box", 40, 80, "Consumables Shelf 3", 1200),
    ("Vacutainer Tubes (EDTA)", "Consumables", "Box", 35, 70, "Phlebotomy Store", 1500),
    ("Vacutainer Tubes (Plain)", "Consumables", "Box", 35, 70, "Phlebotomy Store", 1500),
    ("Nitrile Gloves (M)", "Safety Equipment", "Box", 25, 50, "PPE Cabinet", 950),
    ("Nitrile Gloves (L)", "Safety Equipment", "Box", 25, 50, "PPE Cabinet", 950),
    ("N95 Respirator Masks", "Safety Equipment", "Box", 15, 30, "PPE Cabinet", 2100),
    ("Lab Coats (Disposable)", "Safety Equipment", "Pack", 10, 20, "PPE Cabinet", 1800),
    ("Sharps Disposal Containers", "Safety Equipment", "Piece", 8, 16, "Waste Handling Area", 650),
    ("Culture Media - Blood Agar", "Media & Reagent Kits", "Pack", 12, 24, "Cold Room A", 2600),
    ("Culture Media - MacConkey Agar", "Media & Reagent Kits", "Pack", 12, 24, "Cold Room A", 2400),
    ("Culture Media - Nutrient Broth", "Media & Reagent Kits", "Pack", 10, 20, "Cold Room A", 2200),
    ("Malaria RDT Kits", "Media & Reagent Kits", "Box", 20, 40, "Diagnostics Store", 3500),
    ("HIV RDT Kits", "Media & Reagent Kits", "Box", 20, 40, "Diagnostics Store", 4200),
    ("Pipette Tips (1000uL)", "Consumables", "Pack", 20, 40, "Consumables Shelf 4", 700),
    ("Pipette Tips (200uL)", "Consumables", "Pack", 20, 40, "Consumables Shelf 4", 650),
    ("Test Tubes (Glass, 15ml)", "Glassware", "Box", 15, 30, "Glassware Store", 1100),
    ("Conical Flasks 250ml", "Glassware", "Piece", 8, 16, "Glassware Store", 950),
    ("Beakers 500ml", "Glassware", "Piece", 8, 16, "Glassware Store", 900),
    ("Centrifuge Tubes 50ml", "Consumables", "Box", 20, 40, "Consumables Shelf 5", 1300),
    ("Autoclave Indicator Tape", "Consumables", "Roll", 10, 20, "Sterilization Room", 450),
]

DEPARTMENTS = ["Hematology", "Microbiology", "Biochemistry", "Blood Bank", "Pathology", "Outpatient Clinic"]
PURPOSES = [
    "Routine testing",
    "Emergency case workup",
    "Quality control run",
    "Ward restock",
    "Outreach clinic supply",
    "Training session",
]


class Command(BaseCommand):
    help = "Seed ~4 months of realistic laboratory inventory activity."

    def add_arguments(self, parser):
        parser.add_argument("--months", type=int, default=4, help="How many months of history to generate.")
        parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible data.")
        parser.add_argument("--flush", action="store_true", help="Delete existing inventory data first.")

    def handle(self, *args, **options):
        months = options["months"]
        random.seed(options["seed"])

        if options["flush"]:
            self._flush()

        with transaction.atomic():
            categories = self._seed_categories()
            units = self._seed_units()
            suppliers = self._seed_suppliers()
            staff = self._seed_staff()
            items = self._seed_items(categories, units, suppliers)

        start_date = date.today() - timedelta(days=months * 30)
        self._simulate_activity(items, suppliers, staff, start_date, date.today())

        self.stdout.write(self.style.SUCCESS(f"Refreshing stock snapshots…"))
        services.refresh_all_snapshots()

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(items)} items, {StockReceipt.objects.count()} receipts, "
            f"{DispenseLog.objects.count()} dispenses across {months} months."
        ))

    # ------------------------------------------------------------------
    def _flush(self):
        self.stdout.write("Flushing existing inventory data…")
        DispenseLog.objects.all().delete()
        StockReceipt.objects.all().delete()
        StockSnapshot.objects.all().delete()
        Notification.objects.all().delete()
        AuditLog.objects.all().delete()
        Item.objects.all().delete()
        Category.objects.all().delete()
        Unit.objects.all().delete()
        Supplier.objects.all().delete()
        StaffProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # ------------------------------------------------------------------
    def _seed_categories(self):
        return {name: Category.objects.get_or_create(name=name)[0] for name in CATEGORIES}

    def _seed_units(self):
        return {name: Unit.objects.get_or_create(name=name)[0] for name in UNITS}

    def _seed_suppliers(self):
        suppliers = []
        for name, contact in SUPPLIERS:
            supplier, _ = Supplier.objects.get_or_create(name=name, defaults={"contact_info": contact})
            suppliers.append(supplier)
        return suppliers

    def _seed_staff(self):
        profiles = []
        for username, first, last, role, staff_id in STAFF:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"first_name": first, "last_name": last, "email": f"{username}@lab.local"},
            )
            if created:
                user.set_password("ChangeMe123!")
                user.save()
            profile, _ = StaffProfile.objects.get_or_create(
                user=user,
                defaults={
                    "staff_id": staff_id,
                    "role": role,
                    "department": "Laboratory",
                    "signature_initials": f"{first[0]}{last[0]}",
                    "is_active": True,
                },
            )
            profiles.append(profile)
        return profiles

    def _seed_items(self, categories, units, suppliers):
        items = []
        for idx, (name, cat, unit, min_stock, reorder_qty, location, cost) in enumerate(ITEMS, start=1):
            item, _ = Item.objects.get_or_create(
                item_name=name,
                defaults={
                    "item_code": f"LAB-{idx:03d}",
                    "category": categories[cat],
                    "unit": units[unit],
                    "supplier": random.choice(suppliers),
                    "minimum_stock_level": min_stock,
                    "reorder_quantity": reorder_qty,
                    "storage_location": location,
                    "is_active": True,
                },
            )
            items.append((item, min_stock, reorder_qty, cost))
        return items

    # ------------------------------------------------------------------
    def _simulate_activity(self, items, suppliers, staff, start_date, end_date):
        """
        Walk week by week from start_date to end_date. Each item gets an
        opening receipt, then a mix of periodic replenishment receipts and
        several small dispenses per week, tracked against a running balance
        so we never dispense more than is on hand.
        """
        self.stdout.write("Simulating 4 months of receipts and dispenses…")

        manager_and_techs = [p for p in staff if p.role in (StaffProfile.Role.MANAGER, StaffProfile.Role.TECHNOLOGIST)]

        for item, min_stock, reorder_qty, unit_cost in items:
            balance = 0
            opening_qty = random.randint(min_stock * 2, min_stock * 4)
            opening_receipt_date = start_date

            balance += self._make_receipt(
                item, opening_receipt_date, opening_qty, unit_cost, suppliers, staff
            )

            current = start_date
            week_number = 0
            while current < end_date:
                week_number += 1

                # 2-6 dispenses this week, sized so we usually don't wipe out stock
                for _ in range(random.randint(2, 6)):
                    if balance <= 0:
                        break
                    max_take = max(1, min(balance, int(min_stock * 0.35) or 1))
                    qty = random.randint(1, max_take)
                    dispense_date = current + timedelta(days=random.randint(0, 6))
                    if dispense_date >= end_date:
                        continue
                    balance -= self._make_dispense(item, dispense_date, qty, staff)

                # Replenish roughly every 3-5 weeks (skipped ~15% of the time,
                # which is what lets some items drift into Low/Out of Stock)
                if week_number % random.randint(3, 5) == 0 and random.random() > 0.15:
                    receipt_date = current + timedelta(days=random.randint(0, 6))
                    if receipt_date < end_date:
                        qty = random.randint(reorder_qty, int(reorder_qty * 1.5) or reorder_qty + 1)
                        balance += self._make_receipt(item, receipt_date, qty, unit_cost, suppliers, staff)

                current += timedelta(days=7)

    def _make_receipt(self, item, receipt_date, qty, unit_cost, suppliers, staff):
        staff_member = random.choice(staff)
        expiry = receipt_date + timedelta(days=random.choice([180, 270, 365, 540]))
        batch = f"B{receipt_date.strftime('%y%m')}-{random.randint(100, 999)}"
        variance = Decimal(str(round(random.uniform(0.9, 1.1), 2)))
        try:
            services.create_stock_receipt(
                item=item,
                staff_profile=staff_member,
                date=receipt_date,
                batch_lot=batch,
                expiry_date=expiry,
                supplier=random.choice(suppliers),
                quantity_received=qty,
                unit_cost=(Decimal(unit_cost) * variance).quantize(Decimal("0.01")),
                remarks="",
            )
        except Exception:
            return 0
        return qty

    def _make_dispense(self, item, dispense_date, qty, staff):
        staff_member = random.choice(staff)
        try:
            services.create_dispense_log(
                item=item,
                staff_profile=staff_member,
                date=dispense_date,
                batch_lot="",
                quantity_dispensed=qty,
                recipient_department=random.choice(DEPARTMENTS),
                purpose=random.choice(PURPOSES),
                remarks="",
            )
        except Exception:
            return 0
        return qty
