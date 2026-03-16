from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.database.session import SessionLocal  # noqa: E402
from app.models.customer import Customer  # noqa: E402
from app.models.trip import Trip  # noqa: E402
from app.services.trip_service import _calculate_base_pricing, _calculate_pricing_items_total, _calculate_trip_days  # noqa: E402


def recalculate_trip(trip: Trip):
    pricing_items = [item for item in (trip.pricing_items or []) if item.item_type == "pricing"]
    charge_items = [item for item in (trip.pricing_items or []) if item.item_type == "charge"]
    trip_days = _calculate_trip_days(trip.departure_datetime, trip.return_datetime)

    base_pricing_total = _calculate_base_pricing(
        trip.pricing_type,
        trip.package_amount or 0,
        trip_days,
        trip.distance_km or 0,
        trip.cost_per_km or 0,
        trip.number_of_vehicles or 1,
    )
    pricing_items_total = _calculate_pricing_items_total(
        pricing_items,
        trip.number_of_vehicles or 1,
    )
    charges_total = sum(
        (item.amount if item.amount else (item.quantity or 1) * (item.rate or 0))
        for item in charge_items
    )

    trip.total_charged = (
        base_pricing_total +
        pricing_items_total +
        (trip.charged_toll_amount or 0) +
        (trip.charged_parking_amount or 0) +
        charges_total +
        (trip.other_expenses or 0) -
        (trip.discount_amount or 0)
    )
    trip.pending_amount = max((trip.total_charged or 0) - (trip.amount_received or 0), 0)
    return trip.total_charged, trip.pending_amount


def main():
    db = SessionLocal()
    try:
        trips = db.query(Trip).all()
        customers = db.query(Customer).all()

        changed = 0
        for trip in trips:
            old_total = float(trip.total_charged or 0)
            old_pending = float(trip.pending_amount or 0)
            new_total, new_pending = recalculate_trip(trip)
            if round(old_total, 2) != round(new_total, 2) or round(old_pending, 2) != round(new_pending, 2):
                changed += 1

        for customer in customers:
            customer_trips = [trip for trip in trips if trip.customer_id == customer.id]
            customer.total_trips = len(customer_trips)
            customer.total_billed = sum(float(trip.total_charged or 0) for trip in customer_trips)
            customer.pending_balance = sum(float(trip.pending_amount or 0) for trip in customer_trips)

        db.commit()
        print(f"Recalculated {len(trips)} trips. Updated {changed} trip totals.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
