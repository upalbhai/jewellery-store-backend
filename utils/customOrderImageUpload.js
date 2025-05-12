import multer from "multer";
import path from "path";
import fs from "fs";

// Define storage configuration for custom orders
const customOrderStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/CustomOrders"; // Folder for custom orders

    // Ensure the directory exists; if not, create it
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`); // Unique filename
  },
});

// File filter to accept only images
const customOrderFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only image files are allowed!"), false); // Reject non-image files
  }
};

// Multer middleware for custom orders
export const customOrderImageUpload = multer({
  storage: customOrderStorage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit per file
  fileFilter: customOrderFileFilter,
}).array("images", 5); // Allow max 5 images

