import redis from "../../shared/redis/redis.js";

export const protect = async (req, res, next) => {
    try {
        let sessionId = req.cookies?.session;
        if (!sessionId && req.headers?.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                sessionId = authHeader.slice(7).trim();
            }
        }
        if (!sessionId && req.headers?.["x-session-id"]) {
            sessionId = req.headers["x-session-id"];
        }
        if (!sessionId && req.headers?.cookie) {
            const cookies = req.headers.cookie.split(";");
            for (let c of cookies) {
                const [k, v] = c.trim().split("=");
                if (k === "session") {
                    sessionId = decodeURIComponent(v);
                    break;
                }
            }
        }
        if (!sessionId) {
            return res.status(401).json({ message: "unauthorized" });
        }

        const result = await redis.get(`session-${sessionId}`)
        if (!result) {
            return res.status(401).json({ message: "session not found" })
        }

        const data = JSON.parse(result)
        req.user = data
        next()
    } catch (error) {
        return res.status(500).json({ message: `protect middleware error ${error}` })
    }
}
