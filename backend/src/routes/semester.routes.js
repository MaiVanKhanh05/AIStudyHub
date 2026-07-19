import { Router } from "express";
import * as semesterController from "../controllers/semester.controller.js";

const router = Router();

router.get("/", semesterController.getSemesters);

export default router;
