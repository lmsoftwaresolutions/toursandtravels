import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [searchInvoice, setSearchInvoice] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get("/customers"), api.get("/trips")])
      .then(([customersRes, tripsRes]) => {
        setCustomers(customersRes.data || []);
        setTrips(tripsRes.data || []);
      })
      .catch((err) => {
        console.error(err);
        setCustomers([]);
        setTrips([]);
      });
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const nameMatch = searchName.trim()
      ? String(c.name || "").toLowerCase().includes(searchName.trim().toLowerCase())
      : true;

    const invoiceMatch = searchInvoice.trim()
      ? trips.some(
          (t) =>
            t.customer_id === c.id &&
            String(t.invoice_number || "").toLowerCase().includes(searchInvoice.trim().toLowerCase())
        )
      : true;

    return nameMatch && invoiceMatch;
  });

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button
          onClick={() => navigate("/customers/add")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Customer
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className="border p-2 rounded w-full"
          placeholder="Search by Customer Name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Search by Invoice Number"
          value={searchInvoice}
          onChange={(e) => setSearchInvoice(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 text-left">Customer Name</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan="2" className="p-4 text-center text-gray-500">
                  No customers added
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="2" className="p-4 text-center text-gray-500">
                  No matching customers found
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/customers/edit/${c.id}`)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
