# Calculation Map

This file lists the important calculations in the project, where they happen, and what they mean.

## 1. Trip Cost and Billing

### Backend source of truth
File: `backend/app/services/trip_service.py`

Create trip:
- Lines `54-61`: `total_cost = diesel_used + petrol_used + toll_amount + parking_amount + other_expenses + driver_bhatta`
- Lines `68-77`: pricing total is either:
  - sum of pricing items (`amount` or `quantity * rate`), then multiplied by `number_of_vehicles`
  - or `package_amount * number_of_vehicles`
  - or `distance_km * cost_per_km * number_of_vehicles`
- Lines `79-82`: extra charge items total = sum of each charge item (`amount` or `quantity * rate`)
- Lines `84-91`: `total_charged = pricing_total + charged_toll_amount + charged_parking_amount + charges_total + other_expenses - discount_amount`
- Line `92`: `pending_amount = max(total_charged - amount_received, 0)`
- Lines `167-171`: trip creation also updates summary counters:
  - `vehicle.total_trips += 1`
  - `vehicle.total_km += distance_km`
  - `customer.total_trips += 1`
  - `customer.total_billed += total_charged`
  - `customer.pending_balance += pending_amount`

Update trip:
- Lines `219-220`: `distance_diff = new_distance - old_distance`, then vehicle km is adjusted by that delta
- Lines `259-266`: recalculates `trip.total_cost`
- Lines `285-309`: recalculates `pricing_total`, `charges_total`, `trip.total_charged`, and `trip.pending_amount`
- Lines `348-349`: customer totals are adjusted by deltas:
  - `customer.total_billed += trip.total_charged - prior_total_charged`
  - `customer.pending_balance += trip.pending_amount - prior_pending`

Delete trip:
- Lines `373-379`: reverses vehicle/customer counters and balances

### Pending amount helper
File: `backend/app/models/trip.py`
- Lines `71-73`: `pending_amount = max(0, total_charged - amount_received)`

### Frontend live preview
File: `frontend/src/pages/trips/TripForm.jsx`
- Line `190`: `totalDriverExpenses = sum(driver expense amount)`
- Lines `307-308`: `computedFuelCost = fuel_litres * fuel_rate`
- Lines `311-313`: derived distance from odometer = `max(end_km - start_km, 0)` if distance not entered directly
- Lines `410-416`: `pricingItemsTotal` and `chargeItemsTotal` are summed from form items
- Lines `423-424`: `tripDays = ceil(abs(end - start) / 1 day) + 1`
- Lines `431-436`: `basePricing` is:
  - `pricingItemsTotal`, or
  - for package pricing: `package_amount * tripDays`, or
  - for per-km pricing: `distance_km * cost_per_km`
  - then multiplied by `number_of_vehicles`
- Lines `438-444`: `totalChargedValue = basePricing + charged_toll_amount + charged_parking_amount + chargeItemsTotal + other_expenses - discount_amount`
- Lines `446-451`: `totalAdvancePayments = sum(advance payment amount)` and `totalReceived = amount_received + totalAdvancePayments`
- Line `461`: `pending = max(totalChargedValue - totalReceived, 0)`

## 2. Payment Calculations

File: `backend/app/services/payment_service.py`
- Line `16`: `remaining = total_charged - amount_received`
- Lines `19-23`: blocks overpayment if payment amount is greater than remaining
- Line `39`: `trip.amount_received = existing_received + payment.amount`
- Line `40`: `trip.pending_amount = total_charged - trip.amount_received`
- Lines `71-74`: on delete, payment amount is subtracted and pending is recalculated with `calculate_pending_amount()`

## 3. Fuel Calculations

File: `backend/app/services/fuel_service.py`
- Line `16`: `total_cost = quantity * rate_per_litre`
- Line `63`: same formula on update

Trip form preview:
- File: `frontend/src/pages/trips/TripForm.jsx`
- Line `453`: displayed fuel cost = `fuel_litres * fuel_rate`

Vendor fuel entry:
- File: `frontend/src/pages/vendors/VendorDetails.jsx`
- Line `182`: `total_cost = quantity * rate_per_litre`
- Line `78`: derived rate per litre from trip history = `totalCost / litres` when litres > 0

## 4. Spare Part and Maintenance Calculations

### Spare parts
File: `backend/app/services/spare_part_service.py`
- Line `19`: adding spare part increases vehicle maintenance total by `cost * quantity`
- Lines `36-37`: `old_cost = old cost * old quantity`, `new_cost = new cost * new quantity`
- Line `46`: update adjusts maintenance total by `(new_cost - old_cost)`
- Line `64`: delete subtracts `cost * quantity`

### Monthly maintenance cost spreading
File: `backend/app/services/maintenance_service.py`
- Lines `160-161`: EMI counts full monthly amount
- Line `164`: Insurance is spread monthly as `amount / 12`
- Lines `167-171`: Tax is spread over 3 months as `amount / 3`, but only if current month is within the 90-day window from start date

## 5. Vehicle Summary and Efficiency

File: `backend/app/services/vehicle_stats_service.py`
- Lines `26-32`: `total_trips = count(trips for vehicle)`
- Lines `35-41`: `total_km = sum(trip.distance_km)`
- Lines `43-49`: `trip_cost = sum(trip.total_cost)`
- Line `62`: `maintenance_cost = vehicle.total_maintenance_cost`
- Line `78`: `total_fuel_cost = sum(fuel_costs by type)`
- Line `102`: `total_vehicle_cost = trip_cost + maintenance_cost + total_fuel_cost + monthly_maintenance_cost`

Frontend efficiency view:
- File: `frontend/src/pages/vehicles/VehicleEfficiency.jsx`
- Line `35`: `costPerKm = total_vehicle_cost / total_km` when km > 0
- Line `36`: `fuelCostPerKm = total_fuel_cost / total_km` when km > 0

Frontend vehicle details:
- File: `frontend/src/pages/vehicles/VehicleDetails.jsx`
- Line `116`: average km per trip = `total_km / total_trips`
- Line `124`: cost per km = `total_vehicle_cost / total_km`

## 6. Vendor Balance Calculations

Backend:
- File: `backend/app/services/vendor_stats_service.py`
- Lines `16-20`: `fuel_total = sum(Fuel.total_cost)` for that vendor name
- Lines `22-26`: `spare_total = sum(SparePart.cost * SparePart.quantity)` for that vendor name
- Lines `28-32`: `paid_total = sum(VendorPayment.amount)`
- Line `34`: `total_owed = fuel_total + spare_total`
- Line `35`: `pending = total_owed - paid_total`

Frontend:
- File: `frontend/src/pages/vendors/VendorDetails.jsx`
- Line `110`: total fuel cost = sum of fuel history `total_cost`
- Line `111`: total spare cost = sum of `cost * quantity`
- Line `112`: `totalOwed = totalFuelCost + totalSpareCost`
- Line `113`: total paid = sum of payment amounts
- Line `114`: `pendingAmount = max(0, totalOwed - totalPaid)`
- Line `231`: trip fuel usage summary = sum of `diesel_used + petrol_used`

## 7. Dashboard Profit Calculations

File: `backend/app/api/routes/dashboard.py`
- Line `51`: total trips = trip count
- Line `54`: `income = sum(Trip.total_charged)`
- Line `55`: `total_due = sum(Trip.pending_amount)`
- Line `58`: `trip_expenses = sum(Trip.total_cost)`
- Line `63`: `fuel_cost = sum(Fuel.total_cost)`
- Line `70`: `maintenance_cost = sum(Maintenance.amount)`
- Lines `75-77`: `spare_cost = sum(SparePart.cost * SparePart.quantity)`
- Line `79`: `expenses = trip_expenses + fuel_cost + maintenance_cost + spare_cost`
- Line `80`: `profit = income - expenses`

## 8. Reports Page Calculations

File: `frontend/src/pages/reports/Reports.jsx`
- Line `122`: total distance = sum of `distance_km`
- Line `123`: total revenue = sum of `total_charged`
- Line `124`: total paid = sum of `amount_received`
- Line `125`: total pending = sum of `pending_amount`
- Line `127`: toll and parking = sum of trip toll + parking
- Line `131`: other trip expenses = sum of `other_expenses`
- Line `132`: fuel expenses = sum of fuel `total_cost`
- Line `133`: spare expenses = sum of `cost * quantity`
- Line `134`: maintenance expenses = sum of `amount`
- Line `136`: `tripExpenses = tollAndParking + fuelExpenses + otherTripExpenses`
- Line `137`: `otherExpenses = spareExpenses + maintenanceExpenses`
- Line `138`: `totalExpenses = tripExpenses + otherExpenses`
- Line `139`: `netProfit = totalRevenue - totalExpenses`
- Line `176`: grouped spare part amount also uses `cost * quantity`

## 9. Driver Salary / Due Calculations

File: `frontend/src/pages/drivers/DriverDetails.jsx`
- Line `68`: all-time driver expenses = sum of `expense.amount`
- Line `74`: current month expense total = sum of monthly expense amounts
- Line `77`: monthly bhatta total = sum of monthly trip `driver_bhatta`
- Line `83`: `monthlyTotalDue = monthlySalary + monthlyExpensesTotal + monthlyBhattaTotal`
- Line `86`: `monthlySalaryPaid = sum(salary payment amount)`
- Line `87`: `monthlyPending = max(0, monthlyTotalDue - monthlySalaryPaid)`

## 10. Invoice / Payment / Customer Summary Screens

These screens mostly do display-level sums from already stored values:
- `frontend/src/pages/payments/PaymentHistory.jsx`: totals for billed, received, pending are summed from trips
- `frontend/src/pages/payments/PaymentForm.jsx`: fallback pending = `total_charged - amount_received` if `pending_amount` is missing
- `frontend/src/pages/invoices/InvoiceList.jsx`: totals for invoiced, paid, pending are summed from trips
- `frontend/src/pages/customers/CustomerDetails.jsx`: received amount shown as `total_billed - pending_balance`

## Package pricing standard

Package-trip pricing is now standardized between frontend preview and backend save logic:
- Frontend preview uses `package_amount * tripDays * number_of_vehicles`
- Backend save logic also uses `package_amount * trip_days * number_of_vehicles`

Trip days are counted inclusively:
- same-day trip = `1`
- multi-day trip = `(end_date - start_date) + 1`
