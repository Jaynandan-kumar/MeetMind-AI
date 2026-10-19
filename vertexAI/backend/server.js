import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MONGODB_BASE = process.env.MONGODB_BASE_URI || "";
const REDIS_URL = process.env.REDIS_URL || "";
const OPENROUTER_KEYS = process.env.OPENROUTER_API_KEYS || "";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

const services = [
  {
    name: "auth",
    file: path.resolve(__dirname, "services/auth/index.js"),
    cwd: path.resolve(__dirname, "services/auth"),
    env: {
      PORT: "8001",
      MONGODB_URI: process.env.MONGODB_AUTH_URI || `${MONGODB_BASE}/auth`,
      REDIS_URL,
      NODE_ENV: process.env.NODE_ENV || "production"
    }
  },
  {
    name: "project",
    file: path.resolve(__dirname, "services/project/index.js"),
    cwd: path.resolve(__dirname, "services/project"),
    env: {
      PORT: "8002",
      MONGODB_URI: process.env.MONGODB_PROJECT_URI || `${MONGODB_BASE}/project`,
      REDIS_URL
    }
  },
  {
    name: "file",
    file: path.resolve(__dirname, "services/file/index.js"),
    cwd: path.resolve(__dirname, "services/file"),
    env: {
      PORT: "8003",
      MONGODB_URI: process.env.MONGODB_FILE_URI || `${MONGODB_BASE}/file`,
      REDIS_URL
    }
  },
  {
    name: "ai",
    file: path.resolve(__dirname, "services/ai/index.js"),
    cwd: path.resolve(__dirname, "services/ai"),
    env: {
      PORT: "8004",
      MONGODB_URI: process.env.MONGODB_AI_URI || `${MONGODB_BASE}/ai`,
      REDIS_URL,
      FILE_SERVICE_URL: "http://localhost:8003",
      PROJECT_SERVICE_URL: "http://localhost:8002",
      AUTH_SERVICE: "http://localhost:8001",
      OPENROUTER_API_KEYS: OPENROUTER_KEYS,
      OPENROUTER_API_KEY: OPENROUTER_KEYS.split(",")[0]
    }
  },
  {
    name: "payment",
    file: path.resolve(__dirname, "services/payment/index.js"),
    cwd: path.resolve(__dirname, "services/payment"),
    env: {
      PORT: "8006",
      MONGODB_URI: process.env.MONGODB_PAYMENT_URI || `${MONGODB_BASE}/payment`,
      REDIS_URL,
      RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET,
      AUTH_SERVICE: "http://localhost:8001"
    }
  },
  {
    name: "gateway",
    file: path.resolve(__dirname, "gateway/index.js"),
    cwd: path.resolve(__dirname, "gateway"),
    env: {
      PORT: process.env.PORT || "8000",
      AUTH_SERVICE: "http://localhost:8001",
      PROJECT_SERVICE: "http://localhost:8002",
      FILE_SERVICE: "http://localhost:8003",
      AI_SERVICE: "http://localhost:8004",
      PAYMENT_SERVICE: "http://localhost:8006",
      REDIS_URL,
      FRONTEND_URL: process.env.FRONTEND_URL || "https://meetmind-ide.vercel.app"
    }
  }
];

console.log("[VertexAI Backend Runner] Booting all microservices...");

services.forEach(svc => {
  const child = fork(svc.file, [], {
    cwd: svc.cwd,
    env: { ...process.env, ...svc.env }
  });

  child.on("exit", (code, signal) => {
    console.error(`[Service: ${svc.name}] Exited with code ${code} (${signal})`);
  });

  console.log(`[Service: ${svc.name}] Initialized.`);
});
