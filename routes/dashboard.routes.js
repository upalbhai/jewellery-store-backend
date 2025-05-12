import { authMiddleware } from "../middlewares/authmiddleware.js";
import express from 'express'
import { adminMiddleware } from "../middlewares/adminmiddleWare.js";
import { getDashboardStats, sales } from "../controller/order.controller.js";


const router = express.Router();

router.get('/',authMiddleware,adminMiddleware,getDashboardStats);
router.get('/sales',authMiddleware,adminMiddleware,sales);


export default router;