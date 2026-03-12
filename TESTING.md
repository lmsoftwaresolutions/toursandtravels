# Testing Guide

This file documents the currently added test coverage and the command to run it.

## Current Automated Tests

Backend calculation tests live in:
- `backend/tests/test_calculations.py`

These tests currently cover:
- package-trip pricing uses `trip_days * number_of_vehicles`
- same-day trips count as `1` day
- invalid odometer input is rejected when `end_km < start_km`
- trip pending amount does not go negative after payment settlement
- vendor pending amount does not go negative when paid exceeds owed

## Run The Tests

From the project root:

```powershell
backend\venv\Scripts\python.exe -m unittest backend.tests.test_calculations
```

## Expected Result

You should see output similar to:

```text
.....
----------------------------------------------------------------------
Ran 5 tests in <time>

OK
```

## When To Run These Tests

Run this test module whenever you change:
- `backend/app/services/trip_service.py`
- `backend/app/services/payment_service.py`
- `backend/app/services/vendor_stats_service.py`
- trip pricing formulas
- pending balance formulas
- odometer validation rules

## Manual Validation Checklist

After calculation-related code changes, also verify manually:
- create a package trip and confirm preview matches saved total
- create a same-day package trip and confirm trip days = `1`
- add a payment that fully settles a trip and confirm pending = `0`
- verify vendor summary never shows negative pending
- compare dashboard and reports totals for the same filter range

## Notes

- Backend is the source of truth for all financial calculations.
- Frontend calculations should only be treated as previews.
- If you add more tests later, keep this file updated with the exact command and coverage.
