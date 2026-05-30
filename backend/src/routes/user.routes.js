import { Router } from "express";
import * as userController from "../controllers/user.controller.js";

const router = Router();

router.post("/find-by-email", userController.getUserByEmail);

export default router;
