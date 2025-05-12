import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define upload path
const uploadPath = path.join('uploads', 'Product');

// Create folder dynamically if it doesn't exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);  // Dynamic destination folder
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Multer file filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Multer middleware
export const productImageUpload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
  fileFilter,
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'newImages', maxCount: 10 },
]);
