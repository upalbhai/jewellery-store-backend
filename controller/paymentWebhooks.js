import { Order } from '../models/order.model.js';
import { logPaymentEvent } from '../utils/paymentLogger.js';
import sendEmail from '../utils/sentEmail.js';

export const handlePaymentWebhook = async (req, res) => {
  const { event, payload } = req.body;
  
  try {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (req.headers['x-razorpay-signature'] !== expectedSignature) {
      return res.status(401).send('Invalid signature');
    }

    logPaymentEvent('WEBHOOK_RECEIVED', { event, orderId: payload.order.entity.id });

    switch (event) {
      case 'payment.failed':
        await handlePaymentFailure(payload);
        break;
        
      case 'payment.captured':
        await handlePaymentSuccess(payload);
        break;
        
      default:
        logPaymentEvent('UNHANDLED_WEBHOOK', { event });
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    logPaymentEvent('WEBHOOK_ERROR', { error: error.message });
    res.status(500).send('Error processing webhook');
  }
};

const handlePaymentFailure = async (payload) => {
  const { order_id } = payload.payment.entity;
  
  const order = await Order.findOneAndUpdate(
    { 'razorpayDetails.orderId': order_id },
    {
      $inc: { paymentAttempts: 1 },
      $set: { status: 'payment_failed' },
      $push: {
        statusHistory: {
          status: 'payment_failed',
          changedAt: new Date(),
          reason: payload.payment.entity.error_description || 'Payment failed'
        }
      }
    },
    { new: true }
  ).populate('userId');

  if (order) {
    logPaymentEvent('PAYMENT_FAILED', { orderId: order._id });
    
    // Send failure notification
    if (order.userId) {
      await sendEmail({
        to: order.userId.email,
        subject: 'Payment Failed',
        template: 'payment-failed',
        data: { order }
      });
    }
  }
};

const handlePaymentSuccess = async (payload) => {
  const { order_id, payment_id } = payload.payment.entity;
  
  await Order.findOneAndUpdate(
    { 'razorpayDetails.orderId': order_id },
    {
      status: 'confirmed',
      'razorpayDetails.paymentId': payment_id,
      $push: {
        statusHistory: {
          status: 'confirmed',
          changedAt: new Date()
        }
      }
    }
  );
};