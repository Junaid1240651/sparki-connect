import express from "express";
import wholesalerController from "../controllers/wholesaler.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/addWholesaler", verifyUser, wholesalerController.addWholesaler);
router.get("/getWholesalers/:latitude/:longitude", verifyUser, wholesalerController.getWholesalers);
router.patch("/updateWholesaler/:id", verifyUser, wholesalerController.updateWholesaler);
router.delete("/deleteWholesaler/:id", verifyUser, wholesalerController.deleteWholesaler);

export default router;
