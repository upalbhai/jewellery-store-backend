import mongoose, { Schema } from "mongoose";

const adminSettingsSchema = new Schema({
  aboutus: {
    type: String,
    // required: false,
  },
  shopAddress: {
    type: String,
    // required: false,
  },
  adminEmail: {
    type: String,
    // required: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  contactNumber: {
    type: String,
    // required: true,
    match: [/^\d{10,15}$/, 'Please enter a valid contact number'],
  },
  logo: {
    type: String, // Assuming this will be a URL or file path
    // required: false,
  },
  name: {
    type: String, // Assuming this will be a URL or file path
    // required: false,
  },
  mo_logo: {
    type: String, // Mobile optimized logo
    // required: false,
  },
  socialmedialink: {
    type: [String],
    default: [],
    // validate: {
    //   validator: function(arr) {
    //     return arr.every(link => /^https?:\/\/.+/.test(link));
    //   },
    //   message: 'All social media links must be valid URLs',
    // },
  },
}, { timestamps: true });

export const AdminSettings = mongoose.model('AdminSettings', adminSettingsSchema);
