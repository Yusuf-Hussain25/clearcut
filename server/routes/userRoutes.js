import express from "express";
import requireUser from "../middleware/auth.js";
import { getMe } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/", requireUser, getMe);

export default userRouter;
