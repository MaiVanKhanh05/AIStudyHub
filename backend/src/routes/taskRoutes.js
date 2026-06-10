import express from 'express';
import taskRoutes from './taskRoutes.js';
import { getAllTasks, createTask, deleteTask, updateTask } from '../controllers/taskControllers.js';

const app = express();

const router = express.Router();

router.get("/", getAllTasks);

router.post("/", createTask);

router.put("/:id", updateTask);

router.delete("/:id", deleteTask);


export default router;

