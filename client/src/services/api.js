import axios from "axios";
import { retryAxiosRequest, RETRY_OPTIONS, shouldRetry } from "../utils/retryUtils";
import { errorLog } from "../utils/debugLogger";

const API_BASE_URL = "http://localhost:8080";
// const API_BASE_URL = "https://softindex-ai-project.qcpobm.easypanel.host/";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minutes for general requests
});

// Request interceptor to add retry logic
api.interceptors.request.use(
  (config) => {
    // Store original request function for retry
    if (!config._retryConfig) {
      config._retryConfig = RETRY_OPTIONS.STANDARD;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (retry logic is handled in request wrapper)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      errorLog("API", "API Error", {
        status: error.response.status,
        data: error.response.data,
      });
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
      errorLog("API", "Network Error", { message: error.message });
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
      errorLog("API", "Error", { message: error.message });
      return Promise.reject(error);
    }
  }
);

// Wrapper function to add retry logic to axios requests
const apiWithRetry = {
  ...api,
  get: (url, config = {}) => {
    const retryConfig = config._retryConfig || RETRY_OPTIONS.STANDARD;
    delete config._retryConfig;
    return retryAxiosRequest(() => api.get(url, config), retryConfig);
  },
  post: (url, data, config = {}) => {
    const retryConfig = config._retryConfig || RETRY_OPTIONS.STANDARD;
    delete config._retryConfig;
    return retryAxiosRequest(() => api.post(url, data, config), retryConfig);
  },
  put: (url, data, config = {}) => {
    const retryConfig = config._retryConfig || RETRY_OPTIONS.STANDARD;
    delete config._retryConfig;
    return retryAxiosRequest(() => api.put(url, data, config), retryConfig);
  },
  patch: (url, data, config = {}) => {
    const retryConfig = config._retryConfig || RETRY_OPTIONS.STANDARD;
    delete config._retryConfig;
    return retryAxiosRequest(() => api.patch(url, data, config), retryConfig);
  },
  delete: (url, config = {}) => {
    const retryConfig = config._retryConfig || RETRY_OPTIONS.STANDARD;
    delete config._retryConfig;
    return retryAxiosRequest(() => api.delete(url, config), retryConfig);
  },
  // Expose original axios instance for cases where retry is not needed
  original: api,
};

export default apiWithRetry;
export { API_BASE_URL };
