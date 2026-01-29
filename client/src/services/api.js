import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const analyzeResume = (formData) =>
  API.post("/analysis/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

export default API;
