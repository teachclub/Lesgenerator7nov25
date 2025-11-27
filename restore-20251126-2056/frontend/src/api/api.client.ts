import axios from 'axios';

const backendUrl = 'http://localhost:8080';

export const api = axios.create({
  baseURL: backendUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Onbekende API-fout';
    console.error(`[API Client Fout] ${message}`, error.response?.data);
    return Promise.reject(new Error(message));
  }
);
