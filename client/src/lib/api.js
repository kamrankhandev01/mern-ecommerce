import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
  timeout: 15000,
});

/**
 * If the API is not running the whole store looks "broken" with no clue why.
 *
 * This deliberately does NOT use a toast. The banner is a persistent, non-modal
 * strip rendered by `ApiStatusBanner` — nothing floats over the page, and it
 * cannot be missed while scrolling.
 */
const API_DOWN = "astra:api-down";
const API_UP = "astra:api-up";
let apiDown = false;

const emit = (name) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
};

const markDown = () => {
  if (apiDown) return;
  apiDown = true;
  emit(API_DOWN);
};

const markUp = () => {
  if (!apiDown) return;
  apiDown = false;
  emit(API_UP);
};

api.interceptors.response.use(
  (response) => {
    markUp();
    return response;
  },
  (error) => {
    if (!error.response) {
      // No response at all: server down, wrong port, or CORS blocked it.
      markDown();
    }
    return Promise.reject(error);
  },
);

export const API_DOWN_EVENT = API_DOWN;
export const API_UP_EVENT = API_UP;

export default api;

