import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const analyzeResume = (formData) =>
  API.post("/analysis/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

export const sendChatMessage = (message, context) =>
  API.post("/chat", { message, context });

export default API;
