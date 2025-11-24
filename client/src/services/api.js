import axios from "axios";

const API_BASE_URL = "http://localhost:8080";
// const API_BASE_URL = "https://softindex-ai-project.qcpobm.easypanel.host/";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.data);
      return Promise.reject(error.response.data);
    } else if (error.request) {
      console.error("Network Error:", error.message);
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    } else {
      console.error("Error:", error.message);
      return Promise.reject(error);
    }
  }
);

export default api;
export { API_BASE_URL };
