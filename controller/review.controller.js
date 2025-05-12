import { Product } from "../models/product.model.js";
import Review from "../models/review.model.js";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/sendResponse.js";



export const createReview = async (req, res) => {
    try {
      const { id } = req.user;
      const { productId, rating, content } = req.body;
  
      const user = await User.findById(id);
      if (!user) {
        return sendResponse(res, 404, {
          meta: {
            message: "User not found",
            success: false,
          },
        });
      }
  
      let product = await Product.findById(productId);  
      if (!rating || !content) {
        return sendResponse(res, 400, {
          meta: {
            message: "Content and rating are required",
            success: false,
          },
        });
      }
  
      const review = await Review.create({
        userId: id,
        productId,
        content,
        rating,
      });
  
      user.reviews.push(review._id);
  
        product.reviews.push(review._id);
        await product.save();
  
      await user.save();
  
      return sendResponse(res, 200, {
        meta: {
          message: "Review Created Successfully",
          success: true,
        },
      });
  
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while creating the review",
          error: error.message,
          success: false,
        },
      });
    }
  };
  

  export const deleteReview = async (req, res) => {
    try {
      const { id } = req.user; // User ID from authenticated user
      const { reviewId, productId } = req.body; // ID of the review and related product/shop
  
      // Fetch the review and ensure it exists
      const review = await Review.findById(reviewId);
      if (!review) {
        return sendResponse(res, 404, {
          meta: {
            message: "Review does not exist",
            success: false,
          },
        });
      }
  
      // Ensure the review belongs to the authenticated user
      if (review.userId.toString() !== id.toString()) {
        return sendResponse(res, 403, {
          meta: {
            message: "You are not authorized to delete this review",
            success: false,
          },
        });
      }
  
      // Fetch the associated product or shop
      const product = await Product.findById(productId);
  
      // Fetch the user and ensure the user exists
      const user = await User.findById(id);
      if (!user) {
        return sendResponse(res, 404, {
          meta: {
            message: "User not found",
            success: false,
          },
        });
      }
  
      // Delete the review from the database
      await Review.deleteOne({ _id: reviewId });
  
      // Remove the review reference from the user's reviews
      user.reviews.pull(reviewId);
      await user.save();
  
      // Remove the review reference from the associated product or shop
        product.reviews.pull(reviewId);
        await product.save();
      return sendResponse(res, 200, {
        meta: {
          message: "Review deleted successfully",
          success: true,
        },
      });
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while deleting the review",
          error: error.message,
          success: false,
        },
      });
    }
  };
  
  

  export const editReview = async (req, res) => {
    try {
      const { id } = req.user;
      const { reviewId, rating, content } = req.body;
  
      const review = await Review.findById(reviewId);
      if (!review) {
        return sendResponse(res, 404, {
          meta: {
            message: "Review does not exist",
            success: false,
          },
        });
      }
  
      if (review.userId.toString() !== id.toString()) {
        return sendResponse(res, 403, {
          meta: {
            message: "You are not authorized to edit this review",
            success: false,
          },
        });
      }
  
      const updatedReview = await Review.findByIdAndUpdate(
        reviewId,
        { content, rating },
        { new: true } 
      );
  
      return sendResponse(res, 200, {
        data: updatedReview,
        meta: {
          message: "Review updated successfully",
          success: true,
        },
      });
  
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while editing the review",
          error: error.message,
          success: false,
        },
      });
    }
  };
  
  export const getAllReviews = async (req, res) => {
    try {
      const { productId } = req.body;
      const { page = 1, limit = 10 } = req.query;
  
      const skip = (page - 1) * limit;
      const reviewsPerPage = parseInt(limit, 10);
  
      let reviewsData, totalReviews;
  

        const product = await Product.findById(productId);
  
        if (!product) {
          return sendResponse(res, 404, {
            meta: {
              message: "Product not found",
              success: false,
            },
          });
        }
  
        reviewsData = await Product.findById(productId)
          .populate({
            path: "reviews",
            select: "-productId",
            options: { skip, limit: reviewsPerPage },
            populate: {
              path: "userId",
              select: "name role image",
              populate:{
                path: "image",
                select: "image"
              }
            },
          })
          .select("reviews");
  
        totalReviews = product.reviews.length; // Total reviews for the product
      
  
      // if (!reviewsData || reviewsData.reviews.length === 0) {
      //   return sendResponse(res, 404, {
      //     meta: {
      //       message: "No reviews found",
      //       success: false,
      //     },
      //   });
      // }
  
      const totalPages = Math.ceil(totalReviews / reviewsPerPage);
  
      return sendResponse(res, 200, {
        meta: {
          message: "Reviews retrieved successfully",
          success: true,
          page: parseInt(page, 10),
          limit: reviewsPerPage,
          totalPages,
          totalReviews,
        },
        data: reviewsData.reviews,
      });
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "An error occurred while getting the reviews",
          error: error.message,
          success: false,
        },
      });
    }
  };