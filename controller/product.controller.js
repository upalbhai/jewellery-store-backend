import { Product } from "../models/product.model.js";
import { Report } from "../models/report.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { sendResponse } from "../utils/sendResponse.js";

import fs from 'fs';
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      price,
      subCategory,
      isAvailable,
      stockQuantity
    } = req.body;

    const { id } = req.user;

    if (!req?.files || req?.files?.images?.length === 0) {
      return sendResponse(res, 400, {
        meta: {
          message: "At least one image is required",
          success: false,
        },
      });
    }

    // Get local image paths from multer
    const imagePaths = req.files.images.map(file => file.path);

    // Upload to Cloudinary and store returned URLs
    const cloudinaryUploads = await Promise.all(
      imagePaths.map(async (filePath) => {
        const result = await uploadToCloudinary(filePath);
        return result.secure_url;
      })
    );

    // Create and save product
    const product = new Product({
      name,
      category,
      subCategory,
      description,
      price,
      images: imagePaths,                 // local paths
      clodinaryImages: cloudinaryUploads, // Cloudinary URLs
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      stockQuantity: stockQuantity !== undefined ? stockQuantity : 0,
    });

    await product.save();

    return sendResponse(res, 201, {
      meta: {
        message: "Product created successfully",
        success: true,
      },
      data: product,
    });

  } catch (error) {
    console.error('Error:', error);
    return sendResponse(res, 500, {
      meta: {
        message: "An error occurred while creating the product",
        success: false,
      },
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subCategory,
      description,
      price,
      stockQuantity,
      isAvailable,
      deletedImages,
      _id,
    } = req.body;

    const product = await Product.findById(_id);
    if (!product) {
      return sendResponse(res, 404, {
        meta: { message: "Product Not Found", success: false },
      });
    }

    // Update fields
    product.name = name || product.name;
    product.category = category || product.category;
    product.subCategory = subCategory || product.subCategory;
    product.description = description || product.description;
    product.price = price || product.price;
    product.stockQuantity = stockQuantity || product.stockQuantity;
    product.isAvailable =
      isAvailable !== undefined ? isAvailable : product.isAvailable;

    // Handle local image deletions
    let imagesToDelete = [];

    if (deletedImages) {
      try {
        if (Array.isArray(deletedImages)) {
          imagesToDelete = deletedImages;
        } else if (deletedImages.startsWith("[") && deletedImages.endsWith("]")) {
          imagesToDelete = JSON.parse(deletedImages);
        } else {
          imagesToDelete = [deletedImages];
        }

        product.images = product.images.filter(
          (img) => !imagesToDelete.includes(img)
        );

        for (const imagePath of imagesToDelete) {
          try {
            fs.unlinkSync(imagePath);
          } catch (err) {
            console.error(`Failed to delete image: ${imagePath}`, err);
          }
        }
      } catch (err) {
        return sendResponse(res, 400, {
          meta: { message: "Invalid format for deletedImages", success: false },
        });
      }
    }

    // Handle new image uploads (both local and Cloudinary)
    if (req.files && req.files.images) {
      const newImagePaths = req.files.images.map((file) => file.path);
      product.images.push(...newImagePaths);

      // Upload new images to Cloudinary
      // const cloudinaryUrls = await Promise.all(
      //   newImagePaths.map(async (filePath) => {
      //     const result = await uploadToCloudinary(filePath);
      //     return result.secure_url;
      //   })
      // );

      // if (!product.clodinaryImages) {
      //   product.clodinaryImages = [];
      // }
      // product.clodinaryImages.push(...cloudinaryUrls);
    }

    await product.save();

    return sendResponse(res, 200, {
      meta: { message: "Product updated successfully", success: true },
      data: product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return sendResponse(res, 500, {
      meta: {
        message: "An error occurred while updating the product",
        success: false,
      },
      error: error.message,
    });
  }
};


  export const deleteProduct = async (req, res) => {
    try {
      const {id} = req.body; // Get product ID from URL params
      // Check if the product exists
      const product = await Product.findById(id);
      if (!product) {
        return sendResponse(res, 404, {
          meta: {
            message: 'Product Not Found',
            success: false,
          },
        });
      }
  
      // Remove the product
      await Product.findByIdAndDelete(id);
  
      await Report.deleteMany({reportedEntity:id})

  
      // Send success response
      return sendResponse(res, 200, {
        meta: {
          message: "Product deleted successfully",
          success: true,
        },
      });
    } catch (error) {
      // Catch and handle any errors
      console.error('Error deleting product:', error);
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while deleting the product",
          success: false,
        },
        error: error.message,
      });
    }
  };

  export const getProduct = async (req, res) => {
    try {
      const {id} = req.body; // Get product ID from URL params
  
      // Find the product by ID
      const product = await Product.findById(id) ;// Populating shop and 
      if (!product) {
        return sendResponse(res, 404, {
          meta: {
            message: 'Product Not Found',
            success: false,
          },
        });
      }
  
      // Send success response with the product data
      return sendResponse(res, 200, {
        meta: {
          message: "Product fetched successfully",
          success: true,
        },
        data: product,
      });
    } catch (error) {
      // Catch and handle any errors
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while fetching the product",
          success: false,
        },
        error: error.message,
      });
    }
  };
  

  export const searchProducts = async (req, res) => {
    try {
      const { name, category, subCategory, minPrice, maxPrice, isAvailable, page = 1, limit = 10 } = req.query;
      // Initialize query object
      let query = {};
      // Add filters to the query if they exist
      if (name) {
        query.name = { $regex: name, $options: 'i' }; // Case-insensitive partial match
      }
  
      if (category) {
        query.category = category;
      }
  
      if (subCategory) {
        query.subCategory = subCategory;
      }
  
      if (isAvailable !== undefined) {
        query.isAvailable = isAvailable === 'true';
      }
  
      if (minPrice && maxPrice) {
        query.price = { $gte: minPrice, $lte: maxPrice };
      } else if (minPrice) {
        query.price = { $gte: minPrice };
      } else if (maxPrice) {
        query.price = { $lte: maxPrice };
      }
  
      // Convert page and limit to numbers and calculate skip value
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;
  
      // Find products that match the query with pagination
      const products = await Product.find(query)
        .skip(skip)
        .limit(limitNumber);
  
      // Get the total number of products that match the query
      const totalProducts = await Product.countDocuments(query);

  
      // Calculate the total number of pages
      const totalPages = Math.ceil(totalProducts / limitNumber);
  
      // Return the paginated search results
      return sendResponse(res, 200, {
        meta: {
          message: "Search results retrieved successfully",
          success: true,
          totalItems: totalProducts,
          totalPages,
          currentPage: pageNumber,
          perPage: limitNumber,
          hasNextPage: pageNumber < totalPages,
          hasPreviousPage: pageNumber > 1,
        },
        data: products,
      });
    } catch (error) {
      console.error('Error searching for products:', error);
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while searching for products",
          success: false,
        },
        error: error.message,
      });
    }
  };

  export const getCategories = async (req, res) => {
    try {
      const results = await Product.aggregate([
        {
          $group: {
            _id: null,
            categories: { $addToSet: "$category" },
            subCategories: { $addToSet: "$subCategory" },
          },
        },
      ]);
  
      const categories = results[0]?.categories || [];
      const subCategories = results[0]?.subCategories || [];
  
      return sendResponse(res, 200, {
        meta: {
          message: "Categories and Subcategories retrieved successfully",
          success: true,
        },
        data: { categories, subCategories },
      });
    } catch (error) {
      console.error('Error retrieving categories:', error);
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while retrieving categories",
          success: false,
        },
        error: error.message,
      });
    }
  };
  

  export const suggestingProducts = async (req, res) => {
    try {
      const { id } = req.body;
      const { page = 1, limit = 10 } = req.query; // Default page: 1, limit: 10
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
  
      if (!id) {
        return sendResponse(res, 400, {
          meta: {
            message: 'Product ID is required',
            success: false,
          },
        });
      }
  
      const product = await Product.findById(id);
  
      if (!product) {
        return sendResponse(res, 404, {
          meta: {
            message: 'Product not found',
            success: false,
          },
        });
      }
  
      const suggestingProducts = await Product.find({
        category: product.category,
        _id: { $ne: product._id },
      })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);
  
      const totalProducts = await Product.countDocuments({
        category: product.category,
        _id: { $ne: product._id },
      });
  
      const totalPages = Math.ceil(totalProducts / limitNumber);
  
      return sendResponse(res, 200, {
        meta: {
          message: 'Suggested products retrieved successfully',
          success: true,
          currentPage: pageNumber,
          totalPages,
          totalProducts,
          pageSize: limitNumber,
        },
        data: suggestingProducts,
      });
  
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while retrieving suggested products",
          error: error.message,
          success: false,
        },
      });
    }
  };


  export const addProductDiscount =async(req,res)=>{
    try {
      const { id, discount } = req.body;
    if (discount < 0 || discount > 100) {
      sendResponse(res,400,{
        meta:{
          success:false,
          message:"Discount must be between 1 to 100"
        }
      })
    }
    const product = await Product.findByIdAndUpdate(id, { discount }, { new: true });

    if (!product) return sendResponse(res,404,{
      meta:{
        success:false,
        message:"Product not found"
      }
    })
    return sendResponse(res,200,{
      meta:{
        success:true,
        message:"Discount added successfully",
      },
      data:{
        product
      }
    })
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while retrieving suggested products",
          error: error.message,
          success: false,
        },
      });
    }

  }


  export const removeProductDiscount = async (req, res) => {
    try {
      const { id } = req.body;
  
      const product = await Product.findByIdAndUpdate(id, { discount: 0 }, { new: true });
  
      if (!product) {
        return sendResponse(res, 404, {
          meta: {
            success: false,
            message: "Product not found"
          }
        });
      }
  
      return sendResponse(res, 200, {
        meta: {
          success: true,
          message: "Discount removed successfully"
        },
        data: {
          product
        }
      });
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while removing the discount",
          error: error.message,
          success: false
        }
      });
    }
  };


  export const getFeaturedProductsByCategory = async (req, res) => {
    try {
      // Step 1: Get 3 distinct categories from the products collection
      const categories = await Product.aggregate([
        { $group: { _id: "$category" } },
        { $sort: { _id: 1 } }, // Optional: sort alphabetically or by some logic
        { $limit: 3 }
      ]);
  
      const result = {};
  
      // Step 2: For each of the 3 categories, fetch up to 5 latest products
      await Promise.all(
        categories.map(async ({ _id: category }) => {
          const products = await Product.find({ category })
            .sort({ createdAt: -1 }) // latest first
            .limit(5);
  
          result[category] = products;
        })
      );
  
      return sendResponse(res, 200, {
        meta: {
          message: 'Fetched up to 5 products for 3 categories',
          success: true,
        },
        data: result,
      });
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: 'Server error',
          success: false,
          error: error.message,
        },
      });
    }
  };
  