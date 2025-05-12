import mongoose from "mongoose";
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address:{
    line:{
        type:String,
        // required:true
    },
    line2:{
        type:String,
        // required:true
    },
    city:{
        type:String,
        // required:true
    },
    state:{
        type:String,
        // required:true
    },
    zipCode:{
        type:String,
        // required:true
    }
  },
  phoneNumber: { type: String, required: true },
  role: {
    type: String,
    enum: ['customer','admin'],
    default: 'customer'
  },
  image:{
    type: Schema.Types.ObjectId,
    ref: 'Images',
    // required: true
  },
  orders: [{
    type: Schema.Types.ObjectId,
    ref: 'Order'
  }],
  reviews: [{
    type: Schema.Types.ObjectId,
    ref: 'Review'
  }],
  cart:[{
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true // Product being added to cart
    },
  }],
  wishList:[{
    productId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true // Product being added to cart
      },
  }],
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumDiscount: {
    type: Number,
    default: 0, // e.g., 10 = 10% discount
  },  
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  isEmailVerified: { type: Boolean, default: false }, // Track if the email is verified
  emailVerificationCode: { type: String }, // Token for email verification
  emailVerificationExpires: { type: Date }, // Expiry date for verification token
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
