import { app } from "../config/firebase.js";
import { getAuth } from "firebase-admin/auth";
import User from "../models/user.model.js";
import redis from "../../../shared/redis/redis.js";
import crypto from "crypto";

export const login = async (req, res) => {
    try {
        const { token } = req.body;
        const decoded = await getAuth(app).verifyIdToken(token);

        let user = await User.findOne({
            firebaseUid: decoded.uid
        });

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture,
                credits: 100
            });
        } else if (user.credits == null || user.credits === 0) {
            user.credits = 100;
            await user.save();
        }

        const sessionId = crypto.randomUUID();

        await redis.set(`user-session-${user?._id}`, sessionId, "EX", 7 * 24 * 60 * 60);
        await redis.set(`session-${sessionId}`, JSON.stringify({
            name: user.name,
            _id: user._id,
            email: user.email,
            avatar: user.avatar,
            credits: user.credits
        }), "EX", 7 * 24 * 60 * 60);

        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json(user);
    } catch (error) {
        console.error("LOGIN ERROR IN AUTH SERVICE:", error);
        return res.status(500).json({ message: `login error ${error}` });
    }
};

export const logout = async (req, res) => {
    try {
        const cookieHeader = req.headers?.cookie;
        let sessionId = req.cookies?.session;
        if (!sessionId && cookieHeader) {
            const match = cookieHeader.split(";").find(c => c.trim().startsWith("session="));
            if (match) sessionId = match.split("=")[1]?.trim();
        }

        if (sessionId) {
            await redis.del(`session-${sessionId}`);
        }

        res.clearCookie("session", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
        });
        return res.status(200).json({ message: "logged out successfully" });
    } catch (error) {
        return res.status(500).json({ message: `logout error ${error}` });
    }
};

export const deductCredits = async (req, res) => {
    try {
        const { userId, amount, credits } = req.body;
        const deductAmount = amount !== undefined ? amount : (credits !== undefined ? credits : 1);
        if (!userId) {
            return res.status(401).json({ message: "userId not found" });
        }
        const user = await User.findOneAndUpdate(
            { _id: userId, credits: { $gte: deductAmount } },
            {
                $inc: {
                    credits: -deductAmount
                }
            },
            { returnDocument: "after" }
        );

        if (!user) {
            return res.status(401).json({ message: "insufficient credits" });
        }

        const sessionId = await redis.get(`user-session-${userId}`);
        await redis.set(`session-${sessionId}`, JSON.stringify({
            name: user.name,
            _id: user._id,
            email: user.email,
            avatar: user.avatar,
            credits: user.credits
        }), "EX", 7 * 24 * 60 * 60);

        return res.status(200).json({ credits: user.credits });
    } catch (error) {
        return res.status(500).json({ message: `deduct credits ${error}` });
    }
};

export const addCredits = async (req, res) => {
    try {
        const { userId, plan, credits } = req.body;
        if (!userId) {
            return res.status(401).json({ message: "userId not found" });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({ message: "user not found" });
        }

        user.credits = (user.credits || 0) + Number(credits);
        await user.save();

        const sessionId = await redis.get(`user-session-${userId}`);
        await redis.set(`session-${sessionId}`, JSON.stringify({
            name: user.name,
            _id: user._id,
            email: user.email,
            avatar: user.avatar,
            credits: user.credits
        }), "EX", 7 * 24 * 60 * 60);

        return res.status(200).json(user.credits);
    } catch (error) {
        return res.status(500).json({ message: `add credits ${error}` });
    }
};


