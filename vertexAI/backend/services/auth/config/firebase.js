import { cert, initializeApp, getApps } from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("Error parsing FIREBASE_SERVICE_ACCOUNT env var:", e.message);
    }
}

if (!serviceAccount) {
    const keyPath = path.resolve(__dirname, "../serviceAccountKey.json");
    if (fs.existsSync(keyPath)) {
        try {
            serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
        } catch (e) {
            console.error("Error reading serviceAccountKey.json:", e.message);
        }
    }
}

export const app = getApps().length > 0 
    ? getApps()[0] 
    : initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : undefined
    });
