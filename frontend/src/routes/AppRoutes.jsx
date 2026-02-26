import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";

import Dashboard from "../pages/dashboard/Dashboard";

import VehicleList from "../pages/vehicles/VehicleList";
import VehicleForm from "../pages/vehicles/VehicleForm";
import VehicleDetails from "../pages/vehicles/VehicleDetails";
import VehicleEfficiency from "../pages/vehicles/VehicleEfficiency";
import VehicleEdit from "../pages/vehicles/VehicleEdit";

import TripList from "../pages/trips/TripList";
import TripForm from "../pages/trips/TripForm";
import TripDetails from "../pages/trips/TripDetails";

import CustomerList from "../pages/customers/CustomerList";
import CustomerForm from "../pages/customers/CustomerForm";
import CustomerDetails from "../pages/customers/CustomerDetails";
import CustomerEdit from "../pages/customers/CustomerEdit";

import DriverList from "../pages/drivers/DriverList";
import DriverForm from "../pages/drivers/DriverForm";
import DriverDetails from "../pages/drivers/DriverDetails";

import FuelForm from "../pages/fuel/FuelForm";
import FuelHistory from "../pages/fuel/FuelHistory";
import FuelEdit from "../pages/fuel/FuelEdit";


import SparePartForm from "../pages/spareParts/SparePartForm";
import SparePartList from "../pages/spareParts/SparePartList";
import SparePartDetails from "../pages/spareParts/SparePartDetails";

import PaymentForm from "../pages/payments/PaymentForm";
import PaymentHistory from "../pages/payments/PaymentHistory";

import InvoiceList from "../pages/invoices/InvoiceList";
import InvoiceView from "../pages/invoices/InvoiceView";

import Reports from "../pages/reports/Reports";
import VendorList from "../pages/vendors/VendorList";
import VendorDetails from "../pages/vendors/VendorDetails";
import Notes from "../pages/notes/Notes";

import MaintenanceList from "../pages/maintenance/MaintenanceList";
import MaintenanceForm from "../pages/maintenance/MaintenanceForm";
import Login from "../pages/auth/Login";
import { authService } from "../services/auth";

const RequireAuth = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RequireAdmin = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!authService.isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default function AppRoutes() {
  return (
    <Routes>

      <Route path="/login" element={<Login />} />


      {/* 🔐 Layout Wrapper */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>

        <Route path="/" element={<Dashboard />} />

        {/* Vehicles */}
        <Route path="/vehicles" element={<VehicleList />} />
        <Route path="/vehicles/add" element={<VehicleForm />} />
        <Route path="/vehicles/efficiency" element={
          <RequireAdmin><VehicleEfficiency /></RequireAdmin>
        } />
        <Route path="/vehicles/:vehicle_number" element={<VehicleDetails />} />
        <Route path="/vehicles/:vehicle_number/edit" element={<VehicleEdit />} />

        {/* Trips */}
        <Route path="/trips" element={<TripList />} />
        <Route path="/trips/add" element={<TripForm />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/trips/edit/:id" element={<TripForm />} />


        {/* Customers */}
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/add" element={<CustomerForm />} />
        <Route path="/customers/:id" element={<CustomerDetails />} />
        <Route path="/customers/edit/:id" element={<CustomerEdit />} />

        {/* Drivers */}
        <Route path="/drivers" element={<DriverList />} />
        <Route path="/drivers/add" element={<DriverForm />} />
        <Route path="/drivers/:id" element={<DriverDetails />} />

        {/* Fuel */}
        <Route path="/fuel" element={<FuelForm />} />
        <Route path="/fuel/add" element={<FuelForm />} />
        <Route path="/fuel/history" element={<FuelHistory />} />
        <Route path="/fuel/edit/:id" element={<FuelEdit />} />



        {/* Spare Parts */}
        {/* <Route path="/spare-parts/add" element={<SparePartForm />} />
        <Route path="/spare-parts/edit/:id" element={<SparePartForm />} />
        <Route path="/spare-parts" element={<SparePartList />} /> */}
        <Route path="/spare-parts" element={<SparePartList />} />
        <Route path="/spare-parts/add" element={<SparePartForm />} />
        <Route path="/spare-parts/:id" element={<SparePartDetails />} />
        <Route path="/spare-parts/edit/:id" element={<SparePartForm />} />



        {/* Payments */}
        <Route path="/payments" element={<PaymentHistory />} />
        <Route path="/payments/add" element={<PaymentForm />} />

        {/* Invoices */}
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/:id" element={<InvoiceView />} />

        {/* Maintenance */}
        <Route path="/maintenance" element={<Navigate to="/maintenance/all" replace />} />
        <Route path="/maintenance/:type" element={<MaintenanceList />} />
        <Route path="/maintenance/:type/add" element={<MaintenanceForm />} />
        <Route path="/maintenance/:type/edit/:id" element={<MaintenanceForm />} />

        {/* Reports */}
        <Route path="/reports" element={
          <RequireAdmin><Reports /></RequireAdmin>
        } />

        {/* Vendors */}
        <Route path="/vendors" element={<VendorList />} />
        <Route path="/vendors/fuel" element={<VendorList />} />
        <Route path="/vendors/other" element={<VendorList />} />
        <Route path="/vendors/:id" element={<VendorDetails />} />

        {/* Notes */}
        <Route path="/notes" element={<Notes />} />

      </Route>

    </Routes>
  );
}
