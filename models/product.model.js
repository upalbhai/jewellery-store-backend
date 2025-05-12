import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        trim: true,
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review'
      }],
    subCategory: {
        type: String,
        trim: true,
    },
    images: [{
        type: String, // local image filenames (optional now)
        // no 'required' here
      }],
      clodinaryImages: [{
        type: String, // Cloudinary URLs (optional now)
        // no 'required' here
      }],
    description: {
        type: String,
        required: [true, 'Product description is required'],
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price must be positive'],
    },
    discount: {
        type: Number,
        default: 0, // e.g. 10 means 10% off
      },
    stockQuantity: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock quantity cannot be negative'],
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true
});



export const Product = mongoose.model("Product", ProductSchema);
