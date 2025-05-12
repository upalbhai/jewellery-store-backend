import { sendResponse } from "../utils/sendResponse.js";

export const adminMiddleware = (req, res, next) => {
    try {
      // Check if the user's role is 'admin'
      if (req.user?.role !== 'admin') {
        return sendResponse(res, 403, {
          error: {
            message: "Access denied",
            details: "Admin rights are required to access this resource.",
          },
        });
      }
      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      return sendResponse(res, 500, {
        error: {
          message: "Access check failed",
          details: error.message,
        },
      });
    }
  };