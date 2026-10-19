import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL,
    withCredentials: true
});

api.interceptors.request.use((config) => {
    try {
        const sessionId = localStorage.getItem("vertex_session_id");
        if (sessionId) {
            config.headers.Authorization = `Bearer ${sessionId}`;
            config.headers["x-session-id"] = sessionId;
        }
    } catch (e) {
        // localStorage error fallback
    }
    return config;
});

