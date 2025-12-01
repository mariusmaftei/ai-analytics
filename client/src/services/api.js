import axios from "axios";

const API_BASE_URL = "http://localhost:8080";
// const API_BASE_URL = "https://softindex-ai-project.qcpobm.easypanel.host/";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minutes for general requests
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.data);
      // Preserve the full error object so we can access response.data
      const apiError = new Error(
        error.response.data?.message ||
          error.response.data?.error ||
          "API request failed"
      );
      apiError.response = error.response;
      apiError.status = error.response.status;
      return Promise.reject(apiError);
    } else if (error.request) {
      console.error("Network Error:", error.message);
      // Check if it's a timeout
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return Promise.reject(
          new Error(
            "Request timed out. The file is too large or processing is taking too long. Please try a smaller file or split it into multiple files."
          )
        );
      }
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
