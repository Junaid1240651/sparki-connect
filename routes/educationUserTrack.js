import express from "express";
import educationUserTrackController from "../controllers/educationUserTrack.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/addEducationUserTrack", verifyUser, educationUserTrackController.addEducationUserTrack);
export default router;
