import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/sendResponse.js";
import jwt from "jsonwebtoken";

import crypto from "crypto";
import nodemailer from "nodemailer";
import { Product } from "../models/product.model.js";
import sendEmail from "../utils/sentEmail.js";
import dotenv from "dotenv";
dotenv.config();
export const signUp = async (req, res) => {
    try {
      const { name, phoneNumber, email, password,address } = req.body;
  
      // Check if email already exists
      const userEmail = await User.findOne({ email });
      if (userEmail) {
        return sendResponse(res, 401, {
          meta: {
            message: "Email already exists",
            success: false,
          },
        });
      }
  
      // Hash the password using bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      // Generate email verification code (e.g., 6-digit random number)
      const verificationCode = Math.floor(100000 + Math.random() * 900000);  // 6-digit code
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 1);  // Expiry in 1 hour
  
      // Create a new user
      const user = new User({
        name,
        phoneNumber,
        email,
        address,
        password: hashedPassword, // Store hashed password
        isVerified: false, // Initially set as not verified
        emailVerificationCode: verificationCode,
        emailVerificationExpires,  // Store the expiration time for verification
      });
  
      // Save the user to the database
      await user.save();
  
      // Send verification email
      const transporter = nodemailer.createTransport({
        service: "Gmail", // Use your preferred email service
        auth: {
          user: process.env.EMAIL_USER, // Your email address
          pass: process.env.EMAIL_PASS, // Your email password or app-specific password
        },
      });
  
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Email Verification",
        html: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f4f9f9; border-radius: 8px; border: 1px solid #dcebea;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #1a2c2e; font-size: 24px; font-weight: 600;">Email Verification</h1>
  </div>
  
  <div style="background-color: #f9f6f3; padding: 25px; border-radius: 6px; border-left: 4px solid #3a6567; margin-bottom: 25px;">
    <p style="color: #1a2c2e; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
      Hello <span style="font-weight: 600;">${name}</span>,
    </p>
    <p style="color: #1a2c2e; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Please verify your email by entering the following code:
    </p>
    
    <div style="background-color: #dcebea; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
      <h2 style="color: #2b4244; font-size: 28px; font-weight: 700; letter-spacing: 2px; margin: 0;">
        ${verificationCode}
      </h2>
    </div>
    
    <p style="color: #6f4b3d; font-size: 14px; text-align: center; font-style: italic;">
      The code will expire in 1 hour.
    </p>
  </div>
  
  <div style="text-align: center; color: #4b8081; font-size: 14px; padding-top: 20px; border-top: 1px solid #dcebea;">
    <p style="margin: 0;">If you didn't request this code, please ignore this email.</p>
  </div>
</div>`,
      };
  
      await transporter.sendMail(mailOptions);
  
      // Send success response
      return sendResponse(res, 201, {
        meta: {
          message: "User registered successfully. Please verify your email using the code sent to you.",
          success: true,
        },
      });
    } catch (error) {
      console.error("Error during user registration:", error);
  
      // Send error response
      return sendResponse(res, 500, {
        meta: {
          message: "Internal server error",
          success: false,
        },
      });
    }
  };


  export const verifyEmail = async (req, res) => {
    try {
      const { code, email } = req.body;
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return sendResponse(res, 400, {
          meta: {
            message: "User not found",
            success: false,
          },
        });
      }
  
      // Check if the code matches and if the token has expired
      if (user.emailVerificationCode != parseInt(code)) {
        return sendResponse(res, 400, {
          meta: {
            message: "Invalid verification code",
            success: false,
          },
        });
      }
  
      const currentTime = new Date();
      if (user.emailVerificationExpires < currentTime) {
        return sendResponse(res, 400, {
          meta: {
            message: "Verification code has expired",
            success: false,
          },
        });
      }
  
      // Update user's verification status
      user.isEmailVerified = true;
      user.emailVerificationCode = undefined; // Clear the code after verification
      user.emailVerificationExpires = undefined; // Clear the expiration date
      await user.save();
  
      return sendResponse(res, 200, {
        meta: {
          message: "Email verified successfully, Login your account",
          success: true,
        },
      });
    } catch (error) {
      console.error("Error during email verification:", error);
  
      return sendResponse(res, 500, {
        meta: {
          message: "Internal server error",
          success: false,
        },
      });
    }
  };

  export const resendVerificationCode = async (req, res) => {
    try {
      const { email } = req.body; // Expecting email from the request body
  
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return sendResponse(res, 400, {
          meta: {
            message: "User not found",
            success: false,
          },
        });
      }
  
      // Check if the user is already verified
      if (user.isEmailVerified) {
        return sendResponse(res, 400, {
          meta: {
            message: "Email is already verified",
            success: false,
          },
        });
      }
  
      // Generate a new verification code (6 digits)
      const verificationCode = Math.floor(100000 + Math.random() * 900000);  // 6-digit code
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 1);  // Expiry in 1 hour
  
      // Update the user's email verification code and expiry time
      user.emailVerificationCode = verificationCode;
      user.emailVerificationExpires = emailVerificationExpires;
  
      // Save the updated user
      await user.save();
  
      // Send the new verification code via email
      const transporter = nodemailer.createTransport({
        service: "Gmail", // Use your preferred email service
        auth: {
          user: process.env.EMAIL_USER, // Your email address
          pass: process.env.EMAIL_PASS, // Your email password or app-specific password
        },
      });
  
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Resend Email Verification Code",
        html: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f4f9f9; border-radius: 8px; border: 1px solid #dcebea; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #1a2c2e; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Verification Code Resent</h1>
  </div>
  
  <div style="background-color: #f9f6f3; padding: 25px; border-radius: 6px; border-left: 4px solid #b2845d; margin-bottom: 25px;">
    <p style="color: #1a2c2e; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
      Hello <span style="font-weight: 600; color: #2b4244;">${user.name}</span>,
    </p>
    <p style="color: #1a2c2e; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We received a request to resend the email verification code. Please use the following code to verify your email:
    </p>
    
    <div style="background-color: #f2ece2; padding: 18px; border-radius: 6px; text-align: center; margin: 25px 0; border: 1px dashed #3a6567;">
      <h2 style="color: #2b4244; font-size: 32px; font-weight: 700; letter-spacing: 3px; margin: 0; font-family: monospace;">
        ${verificationCode}
      </h2>
    </div>
    
    <div style="background-color: #dcebea; padding: 12px; border-radius: 4px; text-align: center;">
      <p style="color: #6f4b3d; font-size: 14px; margin: 0; font-weight: 500;">
        ⏳ The code will expire in <span style="font-weight: 600;">1 hour</span>
      </p>
    </div`,
      };
  
      await transporter.sendMail(mailOptions);
  
      // Send success response
      return sendResponse(res, 200, {
        meta: {
          message: "Verification code resent successfully. Please check your email.",
          success: true,
        },
      });
    } catch (error) {
      console.error("Error during resending verification code:", error);
  
      return sendResponse(res, 500, {
        meta: {
          message: "Internal server error",
          success: false,
        },
      });
    }
  };

  


  export const login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check for missing fields
      if (!email || !password) {
        return sendResponse(res, 400, {
          meta: {
            success: false,
            message: "Email and password are required",
          },
        });
      }
  
      // Check if the email exists
      const user = await User.findOne({ email });
      if (!user) {
        return sendResponse(res, 404, {
          meta: {
            success: false,
            message: "User not found",
          },
        });
      }
  
      // Check if the email is verified
      if (!user.isEmailVerified) {
        return sendResponse(res, 403, {
          meta: {
            success: false,
            message: "Email is not verified. Please verify your email to log in.",
          },
        });
      }
  
      // Check if the password matches
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return sendResponse(res, 400, {
          meta: {
            success: false,
            message: "Invalid email or password",
          },
        });
      }
  
      // Create a JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" } // Token expiration time
      );

      // console.log('login token',token)
  
      // Send the token in an HTTP-only cookie
      // When setting cookies (login/signup routes)
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // ✅ Only over HTTPS
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ 'none' allows cross-site
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      
  
      // Send success response with user data (excluding password)
      const { password: _, ...userWithoutPassword } = user.toObject();
      return sendResponse(res, 200, {
        meta: {
          success: true,
          message: "Login successful",
        },
        data: { user: userWithoutPassword },
      });
    } catch (error) {
      console.error("Error during login:", error); // Log the error for debugging
      return sendResponse(res, 500, {
        meta: {
          success: false,
          message: "Server Error",
        },
        error: {
          message: "An error occurred while logging in",
        },
      });
    }
  };
  
  export const logout = (req, res) => {
    try {
      // Clear the token cookie
      res.clearCookie("token", {
        httpOnly: true, // Prevent client-side JS access
        sameSite: "strict", // Protect against CSRF
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      });
  
      return sendResponse(res, 200, {
        meta: {
          message: "Logout successful",
          success: true,
        },
      });
    } catch (error) {
      console.error(error); // Log the error for debugging
      return sendResponse(res, 500, {
        meta: {
          success: false,
          message: "Server Error",
        },
        error: {
          message: "An error occurred while logging out",
        },
      });
    }
  };


  // user profile
  export const userProfile = async(req,res)=>{
    try {
        const {id} = req.user;
        const user = await User.findById(id)      
    if (!user) {
      return sendResponse(res, 404, {
        meta: {
          success: false,
          message: "User not found",
        },
      });
    }
    // Return user data (excluding password for security)
    const { password: _, ...userWithoutPassword } = user.toObject();
    return sendResponse(res, 200, {
      meta: {
        success: true,
        message: "User retrieved successfully",
      },
      data: { user: userWithoutPassword, authenticated: true },
    });
  } catch (error) {
    console.error(error); // Detailed error logging
    return sendResponse(res, 500, {
      meta: {
        success: false,
        message: "Server Error",
      },
      error: {
        message: "An error occurred while retrieving the user",
      },
    });
  }
  }

  export const editProfile = async (req, res) => {
    try {
      const { id } = req.user; // Assuming user ID is attached to req.user
      const { name, phoneNumber } = req.body; // Extract fields to be updated

      if (!name && !phoneNumber) {
        return sendResponse(res,400,{
            meta:{
                success:false,
                message:'At least one field (name, phoneNumber) is required to update.',
            }
        })
      }
  
      // Build the update object dynamically
      const updateData = {};
      if (name) updateData.name = name;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
  
      // Update the user in the database
      const updatedUser = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true } // Return updated document and run validation
      );
  
      // Check if user exists
      if (!updatedUser) {
        return sendResponse(res,404,{
            meta:{
                success:false,
                message:'User not found',
            }
        })
      }
    sendResponse(res,200,{
        meta:{
            success:true,
            message:'Profile updated successfully',
        },
        data:updatedUser
    })
    } catch (error) {
      console.error('Error updating profile:', error);
    sendResponse(res,500,{
        meta:{
            success:false,
            message:'Internal server error',
        },
        error:{
            message:error.message
        }
    })
    }
  };
  

  export const updateAddress = async(req,res)=>{
    try {
        const {id} = req.user;
        const { line, line2, city, state, zipCode } = req.body;
        const user = await User.findById(id);
        if (!user) {
        return sendResponse(res,404,{
            meta:{
                success:false,
                message:'User not found',
            }
        })
        }
        user.address = {
            line,
            line2,
            city,
            state,
            zipCode
          };
      
          await user.save();
          sendResponse(res,200,{
            meta: {
                success: true,
                message: 'Address updated successfully',
            }
          })
    } catch (error) {
        console.error(error);
    sendResponse(res,500,{
        meta:{
            success:false,
            message:'Internal server error',
        },
        error:{
            message:error.message
        }
    })
    }
  }

  export const getAddress= async(req,res)=>{
    try {
        const {id} = req.user;
        const userAddress = await User.findById(id).select('address');
        if (!userAddress) {
            return sendResponse(res,404,{
                meta:{
                    success:false,
                    message:'User not found',
                }
            })
        }
        sendResponse(res,200,{
            data: userAddress.address,
            meta:{
                success:true,
                message:'Address retrieved successfully',
            }
        })
    } catch (error) {
        console.error(error)
        sendResponse(res,500,{
            meta:{
                success:false,
                message:'Internal server error',
            },
            error:{
                message:error.message
            }
        })
    }
  }

  export const addToCart = async (req, res) => {
    const { id } = req.user; // user ID from request
    const { productId } = req.body; // product ID from request body
  
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return sendResponse(res, 404, {
          meta: {
            message: "Product not found",
            success: false,
          },
        });
      }
  
      const user = await User.findById(id);
      if (!user) {
        return sendResponse(res, 400, {
          meta: {
            message: "User not found",
            success: false,
          },
        });
      }
  
      // Check if product is already in the cart
      const productInCart = user.cart.find(
        (item) => item.productId.toString() === productId
      );
      if (productInCart) {
        return sendResponse(res, 409, {
          meta: {
            message: "Product already in the cart",
            success: false,
          },
        });
      }
  
      // Add product to cart
      user.cart.push({
        productId: productId,
      });
  
      // Save user to persist changes
      await user.save();
  
      return sendResponse(res, 201, {
        meta: {
          message: "Product has been added to cart",
          success: true,
        },
        data: user.cart, // return updated cart if necessary
      });
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
        },
      });
    }
  };
  
  export const deleteCartItem = async (req, res) => {
    try {
      const { id } = req.user;
      const { productId } = req.body;
  
      if (!productId) {
        return sendResponse(res, 400, {
          meta: {
            message: "Product ID is required",
            success: false,
          },
        });
      }
  
      const user = await User.findById(id);
      if (!user) {
        return sendResponse(res, 404, {
          meta: {
            message: "User not found",
            success: false,
          },
        });
      }
  
      const productInCart = user.cart.find(item => item._id.toString() == productId);
      if (!productInCart) {
        return sendResponse(res, 404, {
          meta: {
            message: "Product not found in cart",
            success: false,
          },
        });
      }
  
  
      user.cart.pull(productInCart);
      await user.save();
  
  
      return sendResponse(res, 200, {
        meta: {
          message: 'Product removed successfully from the cart',
          success: true,
        },
      });
  
    } catch (error) {
  
      console.error('Error deleting product from cart:', error);
  
  
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
        },
      });
    }
  };
  
  export const viewCart = async (req, res) => {
    const { id } = req.user;
    try {
      const user = await User.findById(id).populate({
        path: "cart.productId",
        select: "name price discount category subCategory images",
      });
  
      if (!user) {
        return sendResponse(res, 404, {
          meta: {
            message: "User not found",
            success: false,
          },
        });
      }
  
      return sendResponse(res, 200, {
        data: user.cart,
        meta: {
          message: "Cart fetched successfully",
          success: true,
        },
      });
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
        },
      });
    }
  };

  export const extractAdminIds = async(req,res)=>{
    try {
      const admin = await User.find({ role: 'admin' }).select('_id');
      if(!admin){
        return sendResponse(res, 404, {
          meta: {
            message: "Admin not found",
            success: false,
          }
        })
      }
      return sendResponse(res, 200, {
        data: admin.map(admin => admin._id),
        meta: {
          message: "Admin IDs extracted successfully",
          success: true,
        }
      })
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
        },
      });
    }
  }


  export const getAllUsers = async (req, res) => {
    try {
      const {
        search = "",
        sortBy = "createdAt",
        order = "desc",
        page = 1,
        limit = 10,
      } = req.query;
  
      const searchRegex = new RegExp(search, "i");
      const searchQuery = {
        $or: [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
          { phoneNumber: { $regex: searchRegex } },
        ],
      };
  
      const sortDirection = order === "asc" ? 1 : -1;
      const sortOptions = {};
      if (["name", "email", "phoneNumber", "isPremium"].includes(sortBy)) {
        sortOptions[sortBy] = sortDirection;
      } else {
        sortOptions["createdAt"] = -1;
      }
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      const [users, total] = await Promise.all([
        User.find(search ? searchQuery : {}).select('name email phoneNumber isPremium premiumDiscount createdAt')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
  
        User.countDocuments(search ? searchQuery : {}),
      ]);
  
      return sendResponse(res, 200, {
        meta: {
          success: true,
          message: "Users retrieved successfully",
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
        data: users,
      });
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
          error: error.message,
        },
      });
    }
  };
  
  export const premiumUsers = async(req,res)=>{
    const { id, isPremium, discount } = req.body;

  if (!id) {
    return sendResponse(res, 400, {
      meta: {
        message: "User ID is required",
        success: false,
      },
    });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return sendResponse(res, 404, {
        meta: {
          message: "User not found",
          success: false,
        },
      });
    }

    if (typeof isPremium === "boolean") {
      user.isPremium = isPremium;
    }

    if (typeof discount === "number") {
      if (discount < 0 || discount > 100) {
        return sendResponse(res, 400, {
          meta: {
            message: "Discount must be between 0 and 100",
            success: false,
          },
        });
      }
      user.premiumDiscount = discount;
    }

    await user.save();

    return sendResponse(res, 200, {
      meta: {
        message: "User premium status updated successfully",
        success: true,
      },
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isPremium: user.isPremium,
        premiumDiscount: user.discount,
      },
    });

  } catch (error) {
    return sendResponse(res, 500, {
      meta: {
        message: "Server error",
        success: false,
        error: error.message,
      },
    });
  }
  }

  export const getUserByIdForAdmin = async(req,res)=>{
    try {
      const {id} = req.params;
      const user = await User.findById(id).select('name email phoneNumber isPremium premiumDiscount');
      if(!user){
        return sendResponse(res,404,{
          meta:{
            message:'User not found',
            success:false
          }
        })
      }
      return sendResponse(res,200,{
        meta:{
          message:'User fetch successfully',
          success:true,
        },
        data:user
      })
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
          error: error.message,
        },
      });
    }
  }

  export const forgotPassword = async(req,res)=>{
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if(!user){
        return sendResponse(res,404,{
          meta:{
            success:false,
          message:'User not found'
          }
        })
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 mins
    await user.save();

    const resetLink = `${process.env.HOSTER_FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail(user.email, 'Reset Your Password', `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f4f9f9; border-radius: 8px; border: 1px solid #dcebea; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #1a2c2e; font-size: 24px; font-weight: 600; margin-bottom: 10px;">🔒 Password Reset Request</h1>
    <div style="height: 3px; width: 60px; background: linear-gradient(to right, #b2845d, #3a6567); margin: 0 auto;"></div>
  </div>
  
  <div style="background-color: #f9f6f3; padding: 25px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #3a6567;">
    <p style="color: #1a2c2e; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      You requested a password reset. Click the button below to create a new password:
    </p>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${resetLink}" style="display: inline-block; padding: 12px 30px; background-color: #3a6567; color: white; text-decoration: none; border-radius: 4px; font-weight: 500; letter-spacing: 0.5px; transition: all 0.3s ease;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #6f4b3d; font-size: 14px; text-align: center; font-style: italic; margin-bottom: 0;">
      This link will expire in 24 hours for security reasons.
    </p>
  </div>
  
  <div style="text-align: center; color: #4b8081; font-size: 14px; padding-top: 20px; border-top: 1px solid #dcebea;">
    <p style="margin: 0 0 10px 0;">If you didn't request this password reset, please ignore this email.</p>
    <p style="margin: 0; font-size: 13px;">For security, don't share this email with anyone.</p>
  </div>
</div>
    `);
    sendResponse(res,200,{
      meta:{
        success:true,
        message:"Reset link has been sent to your email"
      }
    })
    } catch (error) {
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
          error: error.message,
        },
      });
    }
  }


  export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
  
    try {
      const hash = crypto.createHash("sha256").update(token).digest("hex");
  
      const user = await User.findOne({
        resetPasswordToken: hash,
        resetPasswordExpires: { $gt: Date.now() },
      });
  
      if (!user) return sendResponse(res,400,{
        meta:{
          success:false,
          message:"Invalid token or expire token"
        }
      })
      const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
  
      user.password = hashedPassword; // hash it in pre-save middleware
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
  
      await user.save();
      sendResponse(res,200,{
        meta:{
          success:true,
          message:'Password Reset Successfully'
        }
      })
  
    } catch (err) {
      console.error(err);
      return sendResponse(res, 500, {
        meta: {
          message: "Server error",
          success: false,
          error: err.message,
        },
      });    }
  };
  

  export const contactUs = async (req, res) => {
    try {
      const { name, email, phone, message } = req.body;
  
      if (!name || !email || !phone || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }
  
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
  
      const mailOptions = {
        from: `"${name}" <${email}>`,
        to: process.env.EMAIL_USER || process.env.EMAIL_USER,
        subject: 'New Contact Us Message',
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #f4f9f9; border-radius: 8px; border: 1px solid #dcebea; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #dcebea;">
    <h1 style="color: #1a2c2e; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; margin: 0;">
      ✨ New Contact Request
    </h1>
    <p style="color: #4b8081; font-size: 14px; margin-top: 8px;">From your website contact form</p>
  </div>
  
  <div style="background-color: #f9f6f3; padding: 25px; border-radius: 6px; margin-bottom: 20px;">
    <div style="margin-bottom: 15px;">
      <p style="color: #1a2c2e; font-size: 15px; margin: 0 0 5px 0;">
        <span style="display: inline-block; width: 80px; color: #6f4b3d; font-weight: 500;">Name:</span>
        <span style="color: #2b4244; font-weight: 500;">${name}</span>
      </p>
      <p style="color: #1a2c2e; font-size: 15px; margin: 0 0 5px 0;">
        <span style="display: inline-block; width: 80px; color: #6f4b3d; font-weight: 500;">Email:</span>
        <a href="mailto:${email}" style="color: #3a6567; text-decoration: none; font-weight: 500;">${email}</a>
      </p>
      <p style="color: #1a2c2e; font-size: 15px; margin: 0 0 5px 0;">
        <span style="display: inline-block; width: 80px; color: #6f4b3d; font-weight: 500;">Phone:</span>
        <span style="color: #2b4244; font-weight: 500;">${phone}</span>
      </p>
    </div>
    
    <div style="background-color: #f2ece2; padding: 15px; border-radius: 4px; border-left: 3px solid #b2845d;">
      <p style="color: #6f4b3d; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">Message:</p>
      <p style="color: #1a2c2e; font-size: 15px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
  </div>
  
  <div style="text-align: center; color: #4b8081; font-size: 13px; padding-top: 20px; border-top: 1px solid #dcebea;">
    <p style="margin: 0;">This message was sent via your website contact form on ${new Date().toLocaleDateString()}</p>
  </div>
</div>
        `,
      };
  
      await transporter.sendMail(mailOptions);
  
      res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
      console.error('Contact Us Error:', error);
      res.status(500).json({ success: false, message: 'Failed to send message. Try again later.' });
    }
  };