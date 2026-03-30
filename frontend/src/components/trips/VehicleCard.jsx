import React from "react";
import ExpenseItem from "./ExpenseItem";

export default function VehicleCard({ 
  index, 
  entry, 
  vehicles, 
  drivers, 
  vendors = [],
  onEntryChange, 
  onRemoveVehicle,
  onAddDriverChange, 
  onRemoveDriverChange,
  onAddExpense,
  onRemoveExpense,
  onDriverChangeUpdate,
  onExpenseUpdate,
  onAddNewVendor
}) {
  const matchingDrivers = entry.driver_name
    ? drivers.filter((d) => d.name.toLowerCase().includes(entry.driver_name.toLowerCase()))
    : [];

  const fuelVendors = vendors.filter(v => v.category === "fuel" || v.category === "Diesel");

  // Auto-calculate fuel cost
  const calculateFuelCost = (diesel, petrol, price) => {
    const d = parseFloat(diesel) || 0;
    const p = parseFloat(petrol) || 0;
    const pr = parseFloat(price) || 0;
    return (d + p) * pr;
  };

  const handleFuelChange = (field, value) => {
    const updated = { ...entry, [field]: value };
    const cost = calculateFuelCost(
      field === "diesel_used" ? value : entry.diesel_used,
      field === "petrol_used" ? value : entry.petrol_used,
      field === "fuel_price" ? value : entry.fuel_price
    );
    onEntryChange(index, field, value);
    onEntryChange(index, "fuel_cost", cost);
  };

  const handleVehicleSelect = (value) => {
    onEntryChange(index, "vehicle_number", value);
    const match = vehicles.find(v => v.vehicle_number === value);
    if (match) {
      onEntryChange(index, "vehicle_type", match.vehicle_type || "");
      onEntryChange(index, "seat_count", match.seat_count ?? "");
    }
  };

  const handleVendorSelect = (value) => {
    onEntryChange(index, "fuel_vendor", value);
    const match = vendors.find(v => v.name === value);
    onEntryChange(index, "vendor_category", match?.category || "");
  };

  const vendorCategoryValue =
    entry.vendor_category || (vendors.find(v => v.name === entry.fuel_vendor)?.category || "");

  return (
    <div className="glass-card p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden group mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          Vehicle {index + 1}
        </h3>
        <div className="flex items-center gap-4">
           {index > 0 && (
             <button
               type="button"
               onClick={onRemoveVehicle}
               className="text-[9px] font-black text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all"
             >
               Remove Vehicle
             </button>
           )}
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section {index + 1}</span>
        </div>
      </div>

      {/* CORE VEHICLE & DRIVER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle</label>
          <select
            value={entry.vehicle_number}
            onChange={(e) => handleVehicleSelect(e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="">Select Vehicle</option>
            {vehicles.map(v => (
              <option key={v.vehicle_number} value={v.vehicle_number}>{v.vehicle_number}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vehicle Type</label>
          <select
            value={entry.vehicle_type || ""}
            onChange={(e) => onEntryChange(index, "vehicle_type", e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
          >
            <option value="">Select Type</option>
            <option value="seating">Seating</option>
            <option value="sleeper">Sleeper</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">No. of Seats</label>
          <input
            type="number"
            min="1"
            step="1"
            value={entry.seat_count ?? ""}
            onChange={(e) => onEntryChange(index, "seat_count", e.target.value)}
            placeholder="e.g. 32"
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          />
        </div>

        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start KM</label>
          <input
            type="number"
            value={entry.start_km}
            onChange={(e) => onEntryChange(index, "start_km", e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End KM</label>
          <input
            type="number"
            value={entry.end_km}
            onChange={(e) => onEntryChange(index, "end_km", e.target.value)}
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Distance (KM)</label>
          <input
            type="number"
            value={entry.distance_km}
            onChange={(e) => onEntryChange(index, "distance_km", e.target.value)}
            className="w-full h-12 px-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-black text-blue-600 outline-none"
            placeholder="Auto-calculated"
          />
        </div>

        <div className="space-y-2 relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Primary Driver</label>
          <input
            type="text"
            value={entry.driver_name}
            onChange={(e) => {
              onEntryChange(index, "driver_name", e.target.value);
              onEntryChange(index, "driver_id", "");
            }}
            autoComplete="off"
            placeholder="Search or Enter Name"
            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          />
          {matchingDrivers.length > 0 && !entry.driver_id && (
            <div className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              {matchingDrivers.map(d => (
                <div
                  key={d.id}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0"
                  onClick={() => {
                    onEntryChange(index, "driver_name", d.name);
                    onEntryChange(index, "driver_id", String(d.id));
                  }}
                >
                  {d.name}
                </div>
              ))}
            </div>
          )}
        </div>


        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Driver Bhatta (Daily)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold tracking-tight">₹</span>
            <input
              type="number"
              value={entry.driver_bhatta}
              onChange={(e) => onEntryChange(index, "driver_bhatta", e.target.value)}
              className="w-full h-12 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-700 outline-none shadow-sm"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* EXPENSES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Fuel Expenses</h4>
          </div>
          
          <div className="space-y-6">
             <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1 text-[8px]">Fuel Used (Ltr)</span>
                    <input
                      type="number"
                      value={entry.petrol_used}
                      onChange={(e) => handleFuelChange("petrol_used", e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-emerald-500 uppercase ml-1 text-[8px]">Fuel Price / Ltr</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[10px]">₹</span>
                      <input
                        type="number"
                        value={entry.fuel_price}
                        onChange={(e) => handleFuelChange("fuel_price", e.target.value)}
                        className="w-full h-10 pl-7 pr-3 bg-emerald-50/30 border border-emerald-100 rounded-xl text-sm font-black text-emerald-700 shadow-inner"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-blue-600 uppercase ml-1 text-[8px]">Total Fuel Cost</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-[10px]">₹</span>
                      <input
                        type="number"
                        value={entry.fuel_cost}
                        readOnly
                        className="w-full h-10 pl-7 pr-3 bg-blue-50/50 border border-blue-100 rounded-xl text-sm font-black text-blue-700 shadow-inner"
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1 text-[8px]">Select Vendor</span>
                    <select
                      value={entry.fuel_vendor}
                      onChange={(e) => handleVendorSelect(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold"
                    >
                      <option value="">Select Vendor</option>
                      {fuelVendors.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                    {onAddNewVendor && (
                      <button
                        type="button"
                        onClick={() => onAddNewVendor(index)}
                        className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest mt-1 flex items-center gap-1 transition-colors"
                      >
                        <span>+</span> Add New Vendor
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1 text-[8px]">Vendor Category</span>
                    <input
                      type="text"
                      value={vendorCategoryValue}
                      readOnly
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600"
                      placeholder="Auto-filled"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1 text-[8px]">Toll Amount</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">₹</span>
                      <input
                        type="number"
                        value={entry.toll_amount}
                        onChange={(e) => onEntryChange(index, "toll_amount", e.target.value)}
                        className="w-full h-10 pl-7 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-700 shadow-inner"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1 text-[8px]">Parking Amount</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">₹</span>
                      <input
                        type="number"
                        value={entry.parking_amount}
                        onChange={(e) => onEntryChange(index, "parking_amount", e.target.value)}
                        className="w-full h-10 pl-7 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-700 shadow-inner"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
             </div>

             {entry.expenses.map((exp, eIdx) => (
               <ExpenseItem 
                 key={eIdx}
                 expense={exp}
                 onUpdate={(field, val) => onExpenseUpdate(index, eIdx, field, val)}
                 onRemove={() => onRemoveExpense(index, eIdx)}
               />
             ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onAddExpense(index)}
            className="text-[10px] font-black text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl tracking-widest uppercase transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            Add Other Expense
          </button>
        </div>

        {/* DRIVER CHANGES / SHIFTS */}
        <div className="space-y-4 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Relief Drivers / Shifts</h4>
            <button
              type="button"
              onClick={() => onAddDriverChange(index)}
              className="text-[10px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl tracking-widest uppercase transition-all shadow-md shadow-indigo-500/20 active:scale-95 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              Add Driver
            </button>
          </div>
          <div className="space-y-3">
             {entry.driver_changes.map((dc, dIdx) => (
               <div key={dIdx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black text-slate-400 uppercase">Shift {dIdx + 1}</span>
                   <button onClick={() => onRemoveDriverChange(index, dIdx)} className="text-rose-500 hover:text-rose-700">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                   </button>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <select
                      value={dc.driver_id}
                      onChange={(e) => onDriverChangeUpdate(index, dIdx, "driver_id", e.target.value)}
                      className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                    >
                      <option value="">Select Relief Driver</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <input
                      type="datetime-local"
                      value={dc.start_time}
                      onChange={(e) => onDriverChangeUpdate(index, dIdx, "start_time", e.target.value)}
                      className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none font-mono"
                    />
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
