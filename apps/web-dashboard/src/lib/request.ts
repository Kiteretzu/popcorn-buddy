import axios from "axios";
import { clearAuthCookie } from "@/lib/auth-cookie";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_PREFIX,
  timeout: 10_000,
});

instance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      clearAuthCookie();
      window.location.href = "/";
    }
    return Promise.reject(error?.response?.data ?? error);
  }
);

export default instance;
