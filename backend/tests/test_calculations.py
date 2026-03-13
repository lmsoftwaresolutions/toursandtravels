import unittest
from datetime import date, datetime
from pathlib import Path
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(str(Path(__file__).resolve().parents[1]))

import app.models  # noqa: F401
from app.database.base import Base
from app.models.customer import Customer
from app.models.driver import Driver
from app.models.payment import Payment
from app.models.trip import Trip
from app.models.trip_vehicle import TripVehicle
from app.models.vehicle import Vehicle
from app.models.vendor import Vendor
from app.models.vendor_payment import VendorPayment
from app.schemas.payment import PaymentCreate
from app.schemas.trip import TripCreate
from app.schemas.vendor import VendorCreate
from app.services.payment_service import create_payment
from app.services.trip_service import _calculate_trip_days, create_trip
from app.services.vendor_service import add_vendor, list_vendors
from app.services.vendor_stats_service import vendor_summary
from fastapi import HTTPException


class CalculationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _seed_trip_dependencies(self):
        vehicle = Vehicle(vehicle_number="MH12AB1234")
        driver = Driver(name="Driver One")
        customer = Customer(name="Customer One", phone="1234567890")
        self.db.add_all([vehicle, driver, customer])
        self.db.commit()
        self.db.refresh(driver)
        self.db.refresh(customer)
        return vehicle, driver, customer

    def test_calculate_trip_days_counts_same_day_as_one(self):
        start = datetime(2026, 4, 10, 8, 0, 0)
        end = datetime(2026, 4, 10, 20, 0, 0)

        self.assertEqual(_calculate_trip_days(start, end), 1)

    def test_create_trip_package_pricing_uses_days_and_vehicle_count(self):
        _, driver, customer = self._seed_trip_dependencies()

        trip = create_trip(
            self.db,
            TripCreate(
                trip_date=date(2026, 4, 10),
                departure_datetime=datetime(2026, 4, 10, 8, 0, 0),
                return_datetime=datetime(2026, 4, 12, 20, 0, 0),
                from_location="A",
                to_location="B",
                vehicle_number="MH12AB1234",
                driver_id=driver.id,
                customer_id=customer.id,
                number_of_vehicles=2,
                pricing_type="package",
                package_amount=5000,
                cost_per_km=0,
                invoice_number="INV-TEST-001",
            ),
        )

        self.assertEqual(trip.total_charged, 30000)
        self.assertEqual(trip.pending_amount, 30000)

    def test_create_trip_adds_base_fare_and_pricing_items(self):
        _, driver, customer = self._seed_trip_dependencies()

        trip = create_trip(
            self.db,
            TripCreate(
                trip_date=date(2026, 4, 10),
                from_location="Pune",
                to_location="Mumbai",
                vehicle_number="MH12AB1234",
                driver_id=driver.id,
                customer_id=customer.id,
                distance_km=45,
                number_of_vehicles=2,
                pricing_type="per_km",
                cost_per_km=42,
                charged_toll_amount=345,
                charged_parking_amount=500,
                other_expenses=65,
                invoice_number="INV-TEST-BASE-001",
                pricing_items=[
                    {
                        "description": "Diesel",
                        "amount": 3000,
                        "quantity": 1,
                        "rate": 0,
                        "item_type": "pricing",
                    }
                ],
            ),
        )

        self.assertEqual(trip.total_charged, 10690)
        self.assertEqual(trip.pending_amount, 10690)

    def test_create_trip_rejects_end_km_less_than_start_km(self):
        _, driver, customer = self._seed_trip_dependencies()

        with self.assertRaises(HTTPException) as ctx:
            create_trip(
                self.db,
                TripCreate(
                    trip_date=date(2026, 4, 10),
                    from_location="A",
                    to_location="B",
                    vehicle_number="MH12AB1234",
                    driver_id=driver.id,
                    customer_id=customer.id,
                    start_km=200,
                    end_km=150,
                    distance_km=10,
                    pricing_type="per_km",
                    cost_per_km=10,
                    invoice_number="INV-TEST-002",
                ),
            )

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("End KM cannot be less than Start KM", ctx.exception.detail)

    def test_create_trip_with_multiple_vehicle_entries_creates_trip_vehicles(self):
        vehicle_one, driver_one, customer = self._seed_trip_dependencies()
        vehicle_two = Vehicle(vehicle_number="MH14XY4321")
        driver_two = Driver(name="Driver Two")
        self.db.add_all([vehicle_two, driver_two])
        self.db.commit()
        self.db.refresh(driver_two)

        trip = create_trip(
            self.db,
            TripCreate(
                trip_date=date(2026, 4, 10),
                from_location="Pune",
                to_location="Nashik",
                customer_id=customer.id,
                pricing_type="per_km",
                cost_per_km=10,
                invoice_number="INV-TEST-MULTI-001",
                vehicles=[
                    {
                        "vehicle_number": vehicle_one.vehicle_number,
                        "driver_id": driver_one.id,
                        "start_km": 100,
                        "end_km": 150,
                        "distance_km": 50,
                        "driver_bhatta": 400,
                    },
                    {
                        "vehicle_number": vehicle_two.vehicle_number,
                        "driver_id": driver_two.id,
                        "start_km": 1000,
                        "end_km": 1060,
                        "distance_km": 60,
                        "driver_bhatta": 450,
                    },
                ],
            ),
        )

        self.assertEqual(trip.number_of_vehicles, 2)
        self.assertEqual(trip.distance_km, 110)
        self.assertEqual(trip.driver_bhatta, 850)
        self.assertEqual(trip.total_charged, 1100)
        self.assertEqual(
            self.db.query(TripVehicle).filter(TripVehicle.trip_id == trip.id).count(),
            2,
        )

    def test_create_payment_clamps_pending_to_zero_on_exact_settlement(self):
        trip = Trip(
            trip_date=date(2026, 4, 10),
            from_location="A",
            to_location="B",
            vehicle_number="MH12AB1234",
            driver_id=1,
            customer_id=1,
            total_charged=1000,
            amount_received=900,
            pending_amount=100,
            invoice_number="INV-PAY-001",
        )
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)

        payment = create_payment(
            self.db,
            PaymentCreate(
                trip_id=trip.id,
                payment_date=datetime(2026, 4, 10, 12, 0, 0),
                payment_mode="cash",
                amount=100,
                notes="Final payment",
            ),
        )

        self.assertIsInstance(payment, Payment)
        refreshed_trip = self.db.query(Trip).filter(Trip.id == trip.id).first()
        self.assertEqual(refreshed_trip.amount_received, 1000)
        self.assertEqual(refreshed_trip.pending_amount, 0)

    def test_vendor_summary_never_returns_negative_pending(self):
        vendor = Vendor(name="Vendor One", category="fuel")
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)

        self.db.add(
            VendorPayment(
                vendor_id=vendor.id,
                amount=500,
                paid_on=date(2026, 4, 10),
                notes="Overpayment scenario",
            )
        )
        self.db.commit()

        summary = vendor_summary(self.db, vendor.id)

        self.assertEqual(summary["total_owed"], 0)
        self.assertEqual(summary["paid_total"], 500)
        self.assertEqual(summary["pending"], 0)

    def test_vendor_service_normalizes_spare_category_and_keeps_mechanic(self):
        add_vendor(self.db, VendorCreate(name="Spare Vendor", category="spare_parts"))
        add_vendor(self.db, VendorCreate(name="Mechanic Vendor", category="mechanic"))

        spare_vendors = list_vendors(self.db, "spare_parts")
        mechanic_vendors = list_vendors(self.db, "mechanic")
        mechanic_summary = vendor_summary(self.db, mechanic_vendors[0].id)

        self.assertEqual(spare_vendors[0].category, "spare_parts")
        self.assertEqual(mechanic_vendors[0].category, "mechanic")
        self.assertEqual(mechanic_summary["mechanic_total"], 0)


if __name__ == "__main__":
    unittest.main()
