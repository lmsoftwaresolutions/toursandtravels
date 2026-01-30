import axios from "./axios";

export const addVehicleNote = (data) =>
  axios.post("/vehicle-notes/", data);

export const getVehicleNotes = (vehicleId, month) =>
  axios.get("/vehicle-notes/", {
    params: {
      vehicle_id: vehicleId,
      month: month   // "YYYY-MM"
    }
  });
