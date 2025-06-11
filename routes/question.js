import express from "express";
import questionController from "../controllers/question.js";
import verifyUser from "../middleware/verifyUser.js";
const router = express.Router();

router.post("/addQuestion", verifyUser, questionController.addQuestion);
router.post("/addQuestionsViews", verifyUser, questionController.addQuestionViews);
router.post("/addQuestionLikes", verifyUser, questionController.addQuestionLikes);
router.post("/removeQuestionLikes", verifyUser, questionController.removeQuestionLikes);
router.post("/addQuestionComments", verifyUser, questionController.addQuestionComments);
router.get("/getCurrentUserPostedQuestions", verifyUser, questionController.getCurrentUserPostedQuestions);
router.get("/getAllQuestions", verifyUser, questionController.getAllQuestions);
router.get("/getQuestionComments", verifyUser, questionController.getQuestionComments);
export default router;
