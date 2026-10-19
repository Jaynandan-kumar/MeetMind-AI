import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "vertexai-1075d.firebaseapp.com",
    projectId: "vertexai-1075d",
    storageBucket: "vertexai-1075d.firebasestorage.app",
    messagingSenderId: "660149539427",
    appId: "1:660149539427:web:623e8830e6783253a35e56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth=getAuth(app)
export const googleProvider=new GoogleAuthProvider()
