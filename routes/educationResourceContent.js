import express from "express";
import educationContentController from "../controllers/educationResourceContent.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/addEducationResourceContent", verifyUser, educationContentController.addEducationResourceContent);
router.get("/getEducationResourceContent/:getEducationResourceId", verifyUser, educationContentController.getEducationResourceContent);
router.patch("/updateEducationResourceContent/:id", verifyUser, educationContentController.updateEducationResourceContent);
router.delete("/deleteEducationResourcesContent/:id", verifyUser, educationContentController.deleteEducationResourcesContent);

export default router;
