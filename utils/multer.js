import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define upload path

const ensureDirectoryExistence = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
const uploadPath = path.join('uploads', 'Product');
// Admin Upload Path
const adminUploadPath = path.join('uploads', 'Admin');
ensureDirectoryExistence(adminUploadPath);
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

const adminStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, adminUploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

export const adminImageUpload = multer({
  storage: adminStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'mo_logo', maxCount: 1 },
]);