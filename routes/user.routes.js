import express from "express";
import { addToCart, contactUs, deleteCartItem, editProfile, extractAdminIds, forgotPassword, getAddress, getAllUsers, getUserByIdForAdmin, login, logout, premiumUsers, resendVerificationCode, resetPassword, signUp, updateAddress, userProfile, verifyEmail, viewCart } from "../controller/user.controller.js";
import { authMiddleware } from "../middlewares/authmiddleware.js";
import { createAdminNotification, createNotification, deleteNotificationById, deleteNotifications, getNotification, getUnreadNotificationCount, markAllNotificationsAsRead, markNotificationAsRead } from "../controller/notification.controller.js";
import { sendEmailsToCustomers } from "../controller/sendEmail.controller.js";
import { adminMiddleware } from "../middlewares/adminmiddleWare.js";

const router = express.Router();

router.post("/sign-up", signUp);
router.post("/login", login);
router.post("/logout", authMiddleware,logout);
router.post("/verify-email", verifyEmail);
router.post('/resend-verification-code', resendVerificationCode);
router.get('/admin',authMiddleware,adminMiddleware,getAllUsers);
router.get('/admin/:id',authMiddleware,adminMiddleware,getUserByIdForAdmin)
router.post('/admin/premium-user',authMiddleware,adminMiddleware,premiumUsers)
//profile routes
router.get("/profile",authMiddleware,userProfile)
router.put("/profile",authMiddleware,editProfile)

//address routes
router.put('/address',authMiddleware,updateAddress);
router.get('/address',authMiddleware,getAddress);

//cart
router.post("/cart", authMiddleware, addToCart); // pass user id
router.delete("/cart", authMiddleware, deleteCartItem); // pass user id
router.get("/cart", authMiddleware, viewCart); // pass user id

// notifications

router.get('/notification',authMiddleware,getNotification);
router.patch('/notification/mark-as-read-all',authMiddleware,markAllNotificationsAsRead);
router.patch('/notification/mark-as-read/:notificationId',authMiddleware,markNotificationAsRead);
router.post('/notification', authMiddleware, (req, res) => {
  const io = req.io; // Extract `io` from `req`
  if (!io) {
    return res.status(500).json({
      meta: { message: "Socket.IO instance not found.", success: false },
    });
  }
  createAdminNotification(req, res, req.io)});
router.delete('/notification',authMiddleware,deleteNotifications);
router.delete('/notification/:notificationId',authMiddleware,deleteNotificationById);

router.get('/notification/unread-count', authMiddleware, getUnreadNotificationCount);

router.get('/get-admin',authMiddleware,extractAdminIds);

router.post("/send-new-products", sendEmailsToCustomers);

router.post('/forgot-password',forgotPassword);
router.post('/reset-password/:token',resetPassword);
router.post('/contact-us',contactUs)


export default router;