import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image to Cloudinary.
 * @param {string} localFilePath - Local path of the file to upload.
 * @param {string} folder - Optional Cloudinary folder name (e.g., "Product")
 * @returns {Promise<object>} - Result containing secure_url, public_id, etc.
 */
export const uploadToCloudinary = async (localFilePath, folder = 'Product') => {
  try {
    if (!localFilePath) throw new Error("No file path provided");

    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: "image",
    });

    // Optionally delete the file after upload
    // fs.unlinkSync(localFilePath);

    return result;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

/**
 * Deletes an image from Cloudinary by public_id.
 * @param {string} publicId
 * @returns {Promise<object>}
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary Deletion Error:", error);
    throw error;
  }
};
