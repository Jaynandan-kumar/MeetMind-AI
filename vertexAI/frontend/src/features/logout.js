import { api } from "../utils/axios"

export const logout=async () => {
    try {
        localStorage.removeItem("vertex_session_id");
        const {data}=await api.get("/api/auth/logout")
        return data
    } catch (error) {
        localStorage.removeItem("vertex_session_id");
        console.log(error)
        return null
    }
}
