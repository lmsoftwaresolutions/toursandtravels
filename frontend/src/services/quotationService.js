import api from "./api";

export const quotationService = {
  getAll: async () => {
    const response = await api.get("/quotations");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/quotations/${id}`);
    return response.data;
  },

  create: async (quotationData) => {
    const response = await api.post("/quotations", quotationData);
    return response.data;
  },

  update: async (id, quotationData) => {
    const response = await api.put(`/quotations/${id}`, quotationData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/quotations/${id}`);
    return response.data;
  },
};
