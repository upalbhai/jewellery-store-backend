import { createReview, deleteReview, editReview, getAllReviews } from "../controller/review.controller.js";

import { authMiddleware } from "../middlewares/authmiddleware.js";
import express from 'express'
const router = express.Router();

router.post('/',authMiddleware,createReview);
router.put('/',authMiddleware,editReview);
router.delete('/',authMiddleware,deleteReview);

router.post('/all',getAllReviews)

export default router;