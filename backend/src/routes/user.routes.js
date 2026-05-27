import express from "express";
import * as userController from "../controllers/user.controller.js";

const router = express.Router();// routes là cấu nối giữa fe và be

router.post("/find-by-email", userController.getUserByEmail);// nếu thằng frontend nó gọi đường dẫn này thì
//  hàm getUserByEmail sẽ được thực thi, và nó sẽ gọi đến service để lấy dữ liệu user theo email, sau đó trả về cho frontend

export default router;
