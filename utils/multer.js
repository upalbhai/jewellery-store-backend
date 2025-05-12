import multer from 'multer';
import path from 'path';

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/Product');  // Destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);  // Unique filename
  }
});

// Multer file filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);  // Accept the file
  } else {
    cb(new Error('Only image files are allowed!'), false);  // Reject other file types
  }
};

// Multer middleware
export const productImageUpload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter,
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'newImages', maxCount: 10 },
]);



