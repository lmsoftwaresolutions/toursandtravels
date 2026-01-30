import api from "./api";

export const addVehicleNote = (data) =>
  api.post("/vehicle-notes", data);

export const getVehicleNotes = (vehicleId, month) =>
  api.get("/vehicle-notes", {
    params: {
      vehicle_id: vehicleId,
      month
    }
  });
