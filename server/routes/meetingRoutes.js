import express from "express";
import { protect } from "../middleware/auth.js";
import { createMeeting, deleteSession, getMeeting, getMeetingStats, getSessionDetails, getUserSessions, updateUserPlan } from "../controllers/meetingController.js";

const meetingRouter = express.Router();

meetingRouter.post("/", protect, createMeeting);
meetingRouter.post("/plan", protect, updateUserPlan);
meetingRouter.get("/stats", protect, getMeetingStats);
meetingRouter.get("/sessions", protect, getUserSessions);
meetingRouter.get("/sessions/:id", protect, getSessionDetails);
meetingRouter.delete("/sessions/:id", protect, deleteSession);
meetingRouter.get("/:meetingId", protect, getMeeting);

export default meetingRouter;
