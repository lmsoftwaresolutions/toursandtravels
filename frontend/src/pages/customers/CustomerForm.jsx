import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function CustomerForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Customer name is required");
      return;
    }

    try {
      setLoading(true);

      // ✅ TRAILING SLASH IS REQUIRED
      await api.post("/customers", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
      });

      navigate("/customers");
    } catch (err) {
      console.error(err);
      setError("Customer already exists or server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Add Customer</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow w-96"
      >
        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Customer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Contact Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && (
          <p className="text-red-600 text-sm mb-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </form>
    </>
  );
}
