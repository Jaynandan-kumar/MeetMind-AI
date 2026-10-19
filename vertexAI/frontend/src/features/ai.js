import { api } from "../utils/axios"

export const chat = async ({ projectId, message, history = [] }) => {
    try {
        const { data } = await api.post("/api/ai/chat", { projectId, history, message })
        return data
    } catch (error) {
        console.log(error)
        return null
    }
}
