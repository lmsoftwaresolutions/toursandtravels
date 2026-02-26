import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function DriverForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    license_number: "",
    joining_date: "",
    monthly_salary: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post("/drivers", form);
    navigate("/drivers");
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Add Driver</h1>

      <form className="bg-white p-4 rounded shadow w-96" onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Driver Name"
          className="border p-2 w-full mb-3"
          onChange={handleChange}
          required
        />
        <input
          name="phone"
          placeholder="Phone Number"
          className="border p-2 w-full mb-3"
          onChange={handleChange}
        />
        <input
          name="license_number"
          placeholder="License Number"
          className="border p-2 w-full mb-4"
          onChange={handleChange}
        />
        <input
          type="date"
          name="joining_date"
          placeholder="Joining Date"
          className="border p-2 w-full mb-3"
          onChange={handleChange}
        />
        <input
          type="number"
          step="0.01"
          name="monthly_salary"
          placeholder="Monthly Salary"
          className="border p-2 w-full mb-4"
          onChange={handleChange}
          onWheel={(e) => e.currentTarget.blur()}
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Save
        </button>
      </form>
    </>
  );
}
