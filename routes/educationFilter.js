import express from "express";
import educationFilterController from "../controllers/educationFilter.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.get("/getEducationFilter", verifyUser, educationFilterController.getEducationFilter);
export default router;
