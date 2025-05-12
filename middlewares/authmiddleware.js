import jwt from "jsonwebtoken";
import { sendResponse } from "../utils/sendResponse.js";


export const authMiddleware = (req, res, next) => {
    try {
      const token = req.cookies?.token;
      console.log('toen',token)
      if (!token) {
        return sendResponse(res, 401, {
          error: {
            message: "Unauthorized user login again",
            details: "No token provided.",
          },
        });
      }
  
      // Verify the JWT token
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          const message =
            err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
          return sendResponse(res, 401, {
            error: {
              message: "Unauthorized user login again",
              details: message,
            },
          });
        }
    
        // Attach user info to request object
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        next(); // Proceed to the next middleware or route handler
      });
    } catch (error) {
      return sendResponse(res, 500, {
        error: {
          message: "Unauthorized",
          details: error.message,
        },
      });
    }
  };