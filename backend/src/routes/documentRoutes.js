import express from "express";
import { getAllDocuments } from "../controllers/document.controller.js";

const router = express.Router();

router.get("/", getAllDocuments);

export default router;