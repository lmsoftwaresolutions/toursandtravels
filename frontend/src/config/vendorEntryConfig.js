export const vendorEntryConfig = {
  fuel: {
    endpoint: "/fuel",
    fields: [
      { name: "vehicle_number", label: "Vehicle", type: "select" },
      { name: "fuel_type", label: "Fuel Type", type: "select", options: ["diesel", "petrol"] },
      { name: "quantity", label: "Litres", type: "number" },
      { name: "rate_per_litre", label: "Rate per Litre", type: "number" },
      { name: "filled_date", label: "Date", type: "date" }
    ],
    preparePayload: (payload, form) => ({
      ...payload,
      total_cost: Number(form.quantity || 0) * Number(form.rate_per_litre || 0)
    })
  },

  spare_parts: {
    endpoint: "/spare-parts",
    fields: [
      { name: "vehicle_number", label: "Vehicle", type: "select" },
      { name: "part_name", label: "Part Name", type: "text" },
      { name: "cost", label: "Cost", type: "number" },
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "replaced_date", label: "Date", type: "date" }
    ]
  },

  mechanic: {
    endpoint: "/mechanic",
    fields: [
      { name: "vehicle_number", label: "Vehicle", type: "select" },
      { name: "work_description", label: "Work Done", type: "text" },
      { name: "cost", label: "Cost", type: "number" },
      { name: "service_date", label: "Date", type: "date" }
    ]
  }
};
