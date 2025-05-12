import { authMiddleware } from "../middlewares/authmiddleware.js";
import express from 'express'
import { customOrderImageUpload } from "../utils/customOrderImageUpload.js";
import { createCustomOrder, getCustomOrder, getCustomOrderById } from "../controller/custom-order.controller.js";
import { get } from "http";
import { adminMiddleware } from "../middlewares/adminmiddleWare.js";


const router = express.Router();
router.post('/',authMiddleware,customOrderImageUpload,createCustomOrder);
router.get('/',authMiddleware,adminMiddleware,getCustomOrder);
router.get('/:id',authMiddleware,adminMiddleware,getCustomOrderById);


export default router;