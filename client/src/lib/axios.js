import axios from "axios";

const baseURL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // send cookies to the server
});

export default axiosInstance;
