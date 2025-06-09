import express from "express";
import educationController from "../controllers/education.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/addEducationResource", verifyUser, educationController.addEducationResource);
router.get("/getEducationResources", verifyUser, educationController.getEducationResources);
router.patch("/updateEducationResources/:id", verifyUser, educationController.updateEducationResources);
router.delete("/deleteEducationResources/:id", verifyUser, educationController.deleteEducationResources);
export default router;
