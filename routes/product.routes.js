import express from "express";
import { authMiddleware } from "../middlewares/authmiddleware.js";
import { adminMiddleware } from "../middlewares/adminmiddleWare.js";
import { addProductDiscount, createProduct, deleteProduct, getCategories, getFeaturedProductsByCategory, getProduct, removeProductDiscount, searchProducts, suggestingProducts, updateProduct } from "../controller/product.controller.js";
import { productImageUpload } from "../utils/multer.js";

const router = express.Router();

router.post('/',authMiddleware,adminMiddleware,productImageUpload,createProduct);
router.delete('/',authMiddleware,adminMiddleware,deleteProduct);
router.put('/',authMiddleware,adminMiddleware,productImageUpload,updateProduct);
router.post('/discount/add',authMiddleware,adminMiddleware,addProductDiscount)
router.post('/discount/remove',authMiddleware,adminMiddleware,removeProductDiscount)
router.get('/search',searchProducts)
router.post('/product-by-id',getProduct);
router.get('/get-categories',getCategories);
router.get('/feature-product',getFeaturedProductsByCategory)
router.post('/suggested-product',suggestingProducts)
export default router;