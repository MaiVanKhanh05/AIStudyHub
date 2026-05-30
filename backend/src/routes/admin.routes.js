import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";

const router = Router();

// Stats dashboard — BR-AM-08
router.get("/stats", adminController.getAdminStats);

// Users — BR-AM-03
router.get("/users", adminController.getAllUsers);
router.post("/users/:id/lock", adminController.lockUser);
router.post("/users/:id/unlock", adminController.unlockUser);

// Documents — BR-AM-07
router.get("/documents", adminController.getAllDocuments);
router.delete("/documents/:id", adminController.deleteDocument);

export default router;
