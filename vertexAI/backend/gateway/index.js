import "dotenv/config";
import express from "express";
import http from "http";
import net from "net";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import proxy from "express-http-proxy";
import { protect } from "./middleware/protect.js";
import { getCurrentUser } from "./controllers/user.controller.js";
import { proxyWithHeader } from "./utils/proxyWithHeader.js";
const port = process.env.PORT || 8000;

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://meetmind-ide.vercel.app",
    "https://meet-mind-ai-bice.vercel.app"
].filter(Boolean);

const app = express();

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
            return callback(null, origin || true);
        }
        return callback(null, origin || true);
    },
    credentials: true
}));

app.use(cookieParser());
app.use(morgan("dev"));

const terminalService = process.env.TERMINAL_SERVICE || "http://localhost:8005";

app.use("/socket.io", proxy(terminalService));
app.use("/sync-project", proxy(terminalService));

app.use("/api/auth", proxy(process.env.AUTH_SERVICE));
app.use("/api/project", protect, proxyWithHeader(process.env.PROJECT_SERVICE));
app.use("/api/file", protect, proxyWithHeader(process.env.FILE_SERVICE));
app.use("/api/ai", protect, proxyWithHeader(process.env.AI_SERVICE));
app.use("/api/payment", protect, proxyWithHeader(process.env.PAYMENT_SERVICE));
app.get("/api/me", protect, getCurrentUser);
app.get("/me", protect, getCurrentUser);

app.get("/", (req, res) => {
    res.json({ "message": "hello from gateway" });
});

const server = http.createServer(app);

// Forward WebSocket connections (terminal socket.io) to terminal service
server.on("upgrade", (req, clientSocket, head) => {
    const targetSocket = net.connect(8005, "127.0.0.1", () => {
        targetSocket.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            targetSocket.write(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`);
        }
        targetSocket.write("\r\n");
        if (head && head.length > 0) targetSocket.write(head);
        
        targetSocket.pipe(clientSocket);
        clientSocket.pipe(targetSocket);
    });

    targetSocket.on("error", () => {
        clientSocket.destroy();
    });

    clientSocket.on("error", () => {
        targetSocket.destroy();
    });
});

server.listen(port, () => {
    console.log(`gateway started at ${port}`);
});
