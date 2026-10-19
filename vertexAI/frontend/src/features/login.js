import { api } from "../utils/axios";

export const login = async (token) => {
    try {
        const { data } = await api.post("/api/auth/login", { token });
        if (data?.sessionId) {
            localStorage.setItem("vertex_session_id", data.sessionId);
        }
        return data;
    } catch (error) {
        console.log(error);
        return null;
    }
};
