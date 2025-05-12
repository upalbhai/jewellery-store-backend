import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  products: [{
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true
    },
    quantity: { 
      type: Number, 
      required: true
    },
  }],
  totalAmount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending_payment'
  },
  // status: {
  //   type: String,
  //   enum: ['pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled', 'payment_failed'],
  //   default: 'pending_payment'
  // },
  paymentAttempts: {
    type: Number,
    default: 0
  },
  deliveryAddress: {
    line: { type: String, required: true },
    line2: { type: String },
    city:  { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
  },

  // Since you're only using Razorpay
  paymentMethod: { 
    type: String, 
    enum: ['razorpay'], 
    default: 'razorpay',
    required: true 
  },

  razorpayDetails: {
    orderId: { type: String,  },
    paymentId: { type: String, },
    signature: { type: String, }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Order = mongoose.model('Order', OrderSchema);
