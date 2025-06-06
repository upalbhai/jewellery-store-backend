import express from 'express'
import { getAdminSettings, updateAdminSettings } from '../controller/adminSettings.controller.js';
import { adminImageUpload } from '../utils/multer.js';
import { authMiddleware } from '../middlewares/authmiddleware.js';
import { adminMiddleware } from '../middlewares/adminmiddleWare.js';


const router = express.Router();



router.get('/', getAdminSettings);
router.put('/',authMiddleware,adminMiddleware, adminImageUpload, updateAdminSettings); // attach multer middleware

export default router;