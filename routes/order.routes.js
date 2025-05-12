import { downloadReceipt, getOrderById, getOrderByIdForShop, getOrderDetailsForCustomer, getOrderDetailsForShop, orderStatusUpdate, productOrder, retryPayment, verifyPayment } from "../controller/order.controller.js";
import { handlePaymentWebhook } from "../controller/paymentWebhooks.js";
import { adminMiddleware } from "../middlewares/adminmiddleWare.js";
import { authMiddleware } from "../middlewares/authmiddleware.js";
import express from 'express'
const router = express.Router();

router.post('/',authMiddleware,productOrder);
router.post('/verify-payment',authMiddleware,verifyPayment)
router.post('/retry/:orderId', authMiddleware, retryPayment );

// Webhook endpoint (no authentication needed)
router.post('/webhooks/razorpay', 
    express.json({ verify: rawBodySaver }), 
    handlePaymentWebhook
  );
  
  // Middleware to preserve raw body for webhook signature verification
  function rawBodySaver(req, res, buf, encoding) {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
// router.put('/',authMiddleware,editReview);
// router.delete('/',authMiddleware,deleteReview);
// getting order for user
router.get('/user/orders',authMiddleware,getOrderDetailsForCustomer)

router.get('/',authMiddleware,adminMiddleware,getOrderDetailsForShop);

router.post('/order-by-id',authMiddleware,getOrderById);
router.get('/admin/order-by-id/:orderId',authMiddleware,adminMiddleware,getOrderByIdForShop);

router.post('/order/update-status',authMiddleware,orderStatusUpdate)
router.get('/download-receipt/:orderId',authMiddleware,downloadReceipt)
// router.post('/all',getAllReviews)

export default router;