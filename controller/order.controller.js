
import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/sendResponse.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';


import Razorpay from "razorpay";
import { generateReceipt } from "../utils/generateReceipt.js";
import { CustomOrder } from "../models/custom-order.model.js";
import sendEmail from "../utils/sentEmail.js";
import { logPaymentEvent } from "../utils/paymentLogger.js";
import { generateOrderConfirmationEmail } from "../templates/generateOrderCOnfirmationEmail.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


export const productOrder = async (req, res) => {
  try {
    const { products, deliveryAddress } = req.body;
    const { id: userId } = req.user;

    // Validation
    if (!products?.length || !deliveryAddress) {
      return sendResponse(res, 400, {
        meta: { message: "All fields are required", success: false }
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendResponse(res, 401, {
        meta: { message: "User not found", success: false }
      });
    }

    // Calculate order total
    let totalOrderPrice = 0;
    const updatedProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return sendResponse(res, 404, {
          meta: { message: `Product not found: ${item.productId}`, success: false }
        });
      }

      if (!item.quantity || isNaN(item.quantity)) {
        return sendResponse(res, 400, {
          meta: { message: "Invalid quantity", success: false }
        });
      }

      // Apply discounts
      let finalPrice = product.price;
      if (product.discount > 0) finalPrice -= (finalPrice * product.discount) / 100;
      if (user.isPremium && user.premiumDiscount > 0) {
        finalPrice -= (finalPrice * user.premiumDiscount) / 100;
      }

      totalOrderPrice += finalPrice * item.quantity;
      updatedProducts.push({
        productId: item.productId,
        quantity: item.quantity,
        price: finalPrice.toFixed(2)
      });
    }

    // Create Razorpay order FIRST
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalOrderPrice * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        userId: userId.toString(),
        tempOrder: "true" // Mark as temporary
      }
    });

    // Return payment details WITHOUT creating DB order
    return sendResponse(res, 200, {
      meta: { message: "Proceed to payment", success: true },
      data: {
        razorpayOrder,
        orderData: { // Pass all needed data to create after payment
          userId,
          products: updatedProducts,
          totalAmount: totalOrderPrice.toFixed(2),
          deliveryAddress: user.address
        }
      }
    });

  } catch (error) {
    logPaymentEvent('ORDER_CREATION_ERROR', { error: error.message });
    return sendResponse(res, 500, {
      meta: { message: "Order creation failed", success: false }
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      logPaymentEvent('INVALID_SIGNATURE', { razorpay_order_id });
      return sendResponse(res, 400, {
        meta: { message: "Payment verification failed", success: false }
      });
    }

    // Create the actual order in DB
    const newOrder = new Order({
      ...orderData,
      status: "confirmed",
      razorpayDetails: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      },
      statusHistory: [{
        status: "confirmed",
        changedAt: new Date()
      }]
    });

    const savedOrder = await newOrder.save();
    console.log('save order',savedOrder)
    // Update user's orders
    await User.findByIdAndUpdate(
      orderData.userId,
      { $push: { orders: savedOrder._id } }
    );

    const mailOrder = await Order.findById(savedOrder._id).populate({
      path: "products.productId",
      select: "name price images category", // only return these fields from Product
    });

    console.log('mail order',mailOrder);



    // Send confirmation email
// In your controller where you send the email:
await sendEmail(
  req.user.email, 
  'Order Confirmed',
  `${generateOrderConfirmationEmail(mailOrder)}`
);

    return sendResponse(res, 201, {
      meta: { message: "Order created successfully", success: true },
      data: savedOrder
    });

  } catch (error) {
    logPaymentEvent('PAYMENT_VERIFICATION_ERROR', { error: error.message });
    return sendResponse(res, 500, {
      meta: { message: "Payment verification failed", success: false }
    });
  }
};

export const handlePaymentWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (req.headers['x-razorpay-signature'] !== expectedSignature) {
      return res.status(401).send('Invalid signature');
    }

    logPaymentEvent('WEBHOOK_RECEIVED', { event, orderId: payload.payment?.entity?.order_id });

    switch (event) {
      case 'payment.failed':
        await handleFailedPayment(payload);
        break;
        
      case 'payment.captured':
        await handleSuccessfulPayment(payload);
        break;
        
      case 'order.paid':
        // Handle cases where payment was captured but order not created
        await handleOrderPaid(payload);
        break;
        
      default:
        logPaymentEvent('UNHANDLED_WEBHOOK', { event });
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    logPaymentEvent('WEBHOOK_ERROR', { error: error.message });
    res.status(500).send('Error processing webhook');
  }
};

// Handle failed payments
const handleFailedPayment = async (payload) => {
  const payment = payload.payment?.entity;
  if (!payment) return;

  // Check if order exists in DB (for retry cases)
  const order = await Order.findOneAndUpdate(
    { 'razorpayDetails.orderId': payment.order_id },
    {
      $set: { status: 'payment_failed' },
      $inc: { paymentAttempts: 1 },
      $push: {
        statusHistory: {
          status: 'payment_failed',
          changedAt: new Date(),
          reason: payment.error_description || 'Payment failed'
        }
      }
    },
    { new: true }
  ).populate('userId');

  if (order?.userId) {
    await sendEmail({
      to: order.userId.email,
      subject: 'Payment Failed',
      template: 'payment-failed',
      data: { order }
    });
  }
};

// Handle successful payments
const handleSuccessfulPayment = async (payload) => {
  const payment = payload.payment?.entity;
  if (!payment) return;

  // Check if order already exists
  const existingOrder = await Order.findOne({ 
    'razorpayDetails.paymentId': payment.id 
  });

  if (!existingOrder) {
    // Create order if it doesn't exist (edge case)
    await createOrderFromPayment(payment);
  }
};

export const getOrderDetailsForCustomer = async (req, res) => {
  try {
    const { id } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Check if user exists
    const user = await User.findById(id).select('_id').lean();
    if (!user) {
      return sendResponse(res, 404, {
        meta: {
          message: 'User not found',
          success: false,
        },
      });
    }

    // Fetch total count
    const totalOrders = await Order.countDocuments({ userId: id });

    // Fetch paginated orders
    const orders = await Order.find({ userId: id })
      .select('totalAmount status paymentMethod deliveryAddress createdAt')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    return sendResponse(res, 200, {
      meta: {
        message: 'Order fetch for customer successful',
        success: true,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalOrders / limitNumber),
        totalOrders,
        limit: limitNumber,
      },
      data: orders,
    });
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, {
      meta: {
        message: 'Internal server error',
        details: error.message,
      },
    });
  }
};

  export const getOrderByIdForCustomer = async(req,res)=>{
    try {
        const { orderId } = req.params;
        const {id} =req.user;
        const {page = 1, limit = 10 } = req.query;

        const user = await User.findOne({ 
            _id: id, 
            orders: orderId 
          });

        if (!user) {
            return sendResponse(res, 403, {
                meta: {
                    message: "This order does not belongs to you",
                    success: false
                }
            });
        }
        const order = await Order.findById(orderId).populate({
            // path: 'shopId',
            // select:"name",
            // populate:{
            //     path:"owner",
            //     select:"name phoneNumber"
            // }
        });
        if (!order) {
            return sendResponse(res, 404, {
                meta: {
                    message: 'Order not found',
                    success:false
                }
            })
        }
        const totalProducts = order.products.length;
        const skip = (page - 1) * limit;
        const paginatedProducts = order.products.slice(skip, skip + limit);

        // Manually populate productId for paginated products
        const populatedProducts = await Promise.all(
            paginatedProducts.map(async (item) => ({
                ...item.toObject(),
                productId: await Product.findById(item.productId).select(
                    "-stockQuantity -isAvailable -createdAt -updatedAt -role"
                )
            }))
        );

        return sendResponse(res, 200, {
            meta: {
                message: "Order found successfully",
                success: true,
                pagination: {
                    page,
                    limit,
                    totalProducts
                }
            },
            data: {
                ...order.toObject(),
                products: populatedProducts
            }
        });
    } catch (error) {
        console.error(error);
      return sendResponse(res, 500, {
        meta: {
          message: 'Internal server error',
          details: error,
        },
      });
    }
  }
  
  export const getOrderDetailsForShop = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        paymentMethod,
        status,
        dateSort,
        search
      } = req.query;
      const skip = (page - 1) * limit;
  
      // Match filters
      let match = {};
      if (paymentMethod && paymentMethod !== "all") {
        match.paymentMethod = paymentMethod;
      }
      if (status && status !== "all") {
        match.status = status;
      }
  
      const isValidObjectId = search?.match(/^[0-9a-fA-F]{24}$/);
      const pipeline = [
        { $match: match },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
  
        // Search filtering
        ...(search
          ? [{
              $match: {
                $or: [
                  ...(isValidObjectId ? [{ _id: new mongoose.Types.ObjectId(search) }] : []),
                  { "user.name": { $regex: search, $options: "i" } },
                  { "user.email": { $regex: search, $options: "i" } },
                ],
              },
            }]
          : []
        ),
  
        // Replace userId with limited user fields
        {
          $addFields: {
            userId: {
              name: "$user.name",
              email: "$user.email",
              phoneNumber: "$user.phoneNumber",
            },
          },
        },
        { $project: { user: 0 } },
  
        {
          $lookup: {
            from: "addresses",
            localField: "deliveryAddress",
            foreignField: "_id",
            as: "deliveryAddress",
          },
        },
        {
          $unwind: {
            path: "$deliveryAddress",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
  
        // Sorting
        ...(dateSort && {
          latest: [{ $sort: { createdAt: -1 } }],
          oldest: [{ $sort: { createdAt: 1 } }],
          orderIdAsc: [{ $sort: { _id: 1 } }],
          orderIdDesc: [{ $sort: { _id: -1 } }],
        }[dateSort] || []),
  
        { $skip: skip },
        { $limit: parseInt(limit) },
      ];
  
      const orders = await Order.aggregate(pipeline);
  
      // Get total count (without skip and limit)
      const countPipeline = pipeline.filter(
        stage => !("$skip" in stage) && !("$limit" in stage) && !("$sort" in stage)
      );
      countPipeline.push({ $count: "total" });
  
      const totalResult = await Order.aggregate(countPipeline);
      const totalOrders = totalResult[0]?.total || 0;
  
      if (!orders.length) {
        return sendResponse(res, 201, {
          meta: {
            message: "This shop does not have any orders",
            success: false,
          },
        });
      }
  
      sendResponse(res, 200, {
        meta: {
          message: "Orders retrieved successfully",
          success: true,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          pageSize: parseInt(limit),
        },
        data: orders,
      });
    } catch (error) {
      console.error(error);
      return sendResponse(res, 500, {
        meta: {
          message: "Internal server error",
          details: error.message,
          success: false,
        },
      });
    }
  };
  
  

export const orderStatusUpdate = async (req, res) => {
    try {
        const { id } = req.user;
        const { status,orderId,shopId } = req.body;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return sendResponse(res, 404, {
                meta: {
                    message: "Shop not found",
                    success: false
                }
            });
        }

        const user = await User.findOne({ _id: id, shopId: { $in: [shopId] } });
        if (!user) {
            return sendResponse(res, 403, {
                meta: {
                    message: "You are not the owner of this shop",
                    success: false
                }
            });
        }

        const isOrderPresent = await Shop.findOne({ _id: shopId,orders:{$in:[orderId]}})
        if(!isOrderPresent){
            return sendResponse(res,404,{
                meta:{
                    message:"Order not found in this shop",
                    success:false
                }
            })
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return sendResponse(res, 404, {
                meta: {
                    message: "Order not found",
                    success: false
                }
            });
        }

        const validTransitions = {
            pending: ['confirmed', 'shipped', 'delivered', 'cancelled'],
            confirmed: ['shipped', 'delivered', 'cancelled'],
            shipped: ['delivered', 'cancelled'],
            delivered: [],
            cancelled: []
        };

        if (!validTransitions[order.status].includes(status)) {
            return sendResponse(res, 400, {
                meta: {
                    message: `Invalid status change: Cannot change status from ${order.status} to ${status}`,
                    success: false
                }
            });
        }

        order.status = status;
        await order.save();

        // Emit a notification event when order is updated
        req.io.emit('orderUpdated', {
            orderId: order._id,
            newStatus: order.status,
            message: `Order ${order._id} has been updated to ${order.status}`
        });
        return sendResponse(res, 200, {
            meta: {
                message: "Order status updated successfully",
                success: true
            },
            data: {
                orderId: order._id,
                newStatus: order.status
            }
        });
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, {
            meta: {
                message: error.message,
                details: error
            }
        });
    }
};


export const getOrderById = async (req, res) => {
    try {
        const { id } = req.user; // User ID from the authenticated request
        const { orderId,page = 1, limit = 5 } = req.body;

        // Validate request data
        if (!orderId ) {
            return sendResponse(res, 400, {
                meta: {
                    message: "Order ID is required",
                    success: false
                }
            });
        }
        // Fetch the order
        const order = await Order.findById(orderId)
            .populate({
                path: "userId",
                select: "-password -createdAt -updatedAt -reviews -orders -cart -image -address -shopId"
            })

        if (!order) {
            return sendResponse(res, 404, {
                meta: {
                    message: "Order not found in this shop",
                    success: false
                }
            });
        }

        // Implement pagination for products
        const totalProducts = order.products.length;
        const skip = (page - 1) * limit;
        const paginatedProducts = order.products.slice(skip, skip + limit);

        // Manually populate productId for paginated products
        const populatedProducts = await Promise.all(
            paginatedProducts.map(async (item) => ({
                ...item.toObject(),
                productId: await Product.findById(item.productId).select(
                    "-stockQuantity -shopId -isAvailable -createdAt -updatedAt -role"
                )
            }))
        );

        return sendResponse(res, 200, {
            meta: {
                message: "Order found successfully",
                success: true,
        
                    page,
                    limit,
                    totalProducts
            },
            data: {
                ...order.toObject(),
                products: populatedProducts
            }
        });
    } catch (error) {
        console.error("Error in getOrderById:", error);
        return sendResponse(res, 500, {
            meta: {
                message: "Internal server error",
                success: false
            }
        });
    }
};


export const getOrderByIdForShop = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return sendResponse(res, 400, {
        meta: {
          message: "Order ID is required",
          success: false,
        },
      });
    }

    const order = await Order.findById(orderId)
      .populate({
        path: "userId",
        select: "name email phoneNumber", // only return these fields from User
      })
      .populate({
        path: "products.productId",
        select: "name price images category", // only return these fields from Product
      });

    if (!order) {
      return sendResponse(res, 404, {
        meta: {
          message: "Order not found",
          success: false,
        },
      });
    }

    return sendResponse(res, 200, {
      data: order,
      meta: {
        message: "Order fetched successfully",
        success: true,
      },
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return sendResponse(res, 500, {
      meta: {
        message: "Internal server error",
        success: false,
      },
    });
  }
};

export const downloadReceipt = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
      .populate('userId', 'name email phoneNumber')
      .populate('products.productId', 'name category price');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const pdfBuffer = await generateReceipt(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${orderId}.pdf`);
    res.end(pdfBuffer); // ✅ Use end() for binary data

  } catch (err) {
    console.error('Receipt download failed:', err);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
};


export const getDashboardStats = async (req, res) => {
  try {
    const { year, month } = req.query;

    // Create date filter if year/month provided
    let dateFilter = {};
    if (year) {
      dateFilter.createdAt = {
        $gte: new Date(year, 0, 1),
        $lt: new Date(parseInt(year) + 1, 0, 1)
      };
      
      if (month) {
        dateFilter.createdAt = {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1)
        };
      }
    }

    // Helper function to determine trend
    const getTrend = (current, previous) => {
      if (current > previous) return 'up';
      if (current < previous) return 'down';
      return 'neutral';
    };

    // Calculate previous period dates
    let previousPeriodStart, previousPeriodEnd;
    if (year && month) {
      // Previous month comparison
      previousPeriodStart = new Date(year, month - 2, 1);
      previousPeriodEnd = new Date(year, month - 1, 1);
    } else if (year) {
      // Previous year comparison
      previousPeriodStart = new Date(parseInt(year) - 1, 0, 1);
      previousPeriodEnd = new Date(year, 0, 1);
    } else {
      // Default to previous year comparison if no filter
      const currentYear = new Date().getFullYear();
      previousPeriodStart = new Date(currentYear - 1, 0, 1);
      previousPeriodEnd = new Date(currentYear, 0, 1);
    }

    // Execute all queries in parallel
    const [
      topSellingProducts,
      topSellingCategories,
      currentUsers,
      currentCustomOrders,
      currentOrderAnalytics,
      topCostlyOrders,
      latestCustomOrders,
      previousUsers,
      previousCustomOrders,
      previousOrderAnalytics
    ] = await Promise.all([
      // Current period queries
      Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$products.productId",
            totalQuantity: { $sum: "$products.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $project: {
            productId: "$_id",
            name: "$productDetails.name",
            category: "$productDetails.category",
            totalQuantity: 1,
            image: { $arrayElemAt: ["$productDetails.images", 0] }
          }
        }
      ]),

      Order.aggregate([
        { $match: dateFilter },
        { $unwind: "$products" },
        {
          $lookup: {
            from: "products",
            localField: "products.productId",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.category",
            totalQuantity: { $sum: "$products.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
      ]),

      User.countDocuments(year || month ? dateFilter : {}),

      CustomOrder.countDocuments(year || month ? dateFilter : {}),

      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalSales: { $sum: 1 },
            avgPricePerOrder: { $avg: "$totalAmount" }
          }
        }
      ]),

      Order.find(dateFilter)
        .sort({ totalAmount: -1 })
        .limit(5)
        .populate('userId', 'name email')
        .populate('products.productId', 'name category'),
        
      CustomOrder.find(year || month ? dateFilter : {})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email'),

      // Previous period queries
      User.countDocuments({
        createdAt: {
          $gte: previousPeriodStart,
          $lt: previousPeriodEnd
        }
      }),

      CustomOrder.countDocuments({
        createdAt: {
          $gte: previousPeriodStart,
          $lt: previousPeriodEnd
        }
      }),

      Order.aggregate([
        { 
          $match: {
            createdAt: {
              $gte: previousPeriodStart,
              $lt: previousPeriodEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalSales: { $sum: 1 },
            avgPricePerOrder: { $avg: "$totalAmount" }
          }
        }
      ])
    ]);

    // Extract current analytics
    const currentAnalytics = currentOrderAnalytics[0] || {
      totalRevenue: 0,
      totalSales: 0,
      avgPricePerOrder: 0
    };

    // Extract previous analytics
    const previousAnalytics = previousOrderAnalytics[0] || {
      totalRevenue: 0,
      totalSales: 0,
      avgPricePerOrder: 0
    };

    // Prepare the response
    const response = {
      topSellingProducts,
      topSellingCategories,
      totalUsers: currentUsers,
      totalCustomOrders: currentCustomOrders,
      totalRevenue: currentAnalytics.totalRevenue,
      totalSales: currentAnalytics.totalSales,
      topCostlyOrders,
      avgPricePerOrder: currentAnalytics.avgPricePerOrder,
      latestCustomOrders: latestCustomOrders || [],
      comparison: {
        totalRevenue: {
          current: currentAnalytics.totalRevenue,
          previous: previousAnalytics.totalRevenue,
          trend: getTrend(currentAnalytics.totalRevenue, previousAnalytics.totalRevenue)
        },
        totalSales: {
          current: currentAnalytics.totalSales,
          previous: previousAnalytics.totalSales,
          trend: getTrend(currentAnalytics.totalSales, previousAnalytics.totalSales)
        },
        totalUsers: {
          current: currentUsers,
          previous: previousUsers,
          trend: getTrend(currentUsers, previousUsers)
        },
        avgPricePerOrder: {
          current: currentAnalytics.avgPricePerOrder,
          previous: previousAnalytics.avgPricePerOrder,
          trend: getTrend(currentAnalytics.avgPricePerOrder, previousAnalytics.avgPricePerOrder)
        },
        totalCustomOrders: {
          current: currentCustomOrders,
          previous: previousCustomOrders,
          trend: getTrend(currentCustomOrders, previousCustomOrders)
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

function getTrend(current, previous) {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}


export const sales = async(req,res)=>{
  try {
    // Total counts
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    // Revenue calculations
    const revenueResult = await Order.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .populate('products.productId', 'name price');
    
    // Order status counts
    const orderStatusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Monthly revenue
    const monthlyRevenue = await Order.aggregate([
      { $match: { status: 'confirmed' } },
      { 
        $group: { 
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$totalAmount' }
        } 
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);
    
    // User growth
    const userGrowth = await User.aggregate([
      { 
        $group: { 
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        } 
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);
    
    // Top products
    const topProducts = await Order.aggregate([
      { $unwind: '$products' },
      { 
        $group: { 
          _id: '$products.productId', 
          count: { $sum: '$products.quantity' } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $project: { name: '$product.name', count: 1 } }
    ]);

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrders,
      orderStatusCounts,
      monthlyRevenue,
      userGrowth,
      topProducts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


export const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId } = req.user;

    const order = await Order.findOne({
      _id: orderId,
      userId,
      status: 'payment_failed',
      paymentAttempts: { $lt: 3 }
    });

    if (!order) {
      return sendResponse(res, 400, {
        meta: { 
          message: order?.paymentAttempts >= 3 
            ? "Maximum payment attempts reached" 
            : "Order cannot be retried",
          success: false 
        }
      });
    }

    // Create new Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: `retry_${order._id}_${Date.now()}`,
      payment_capture: 1,
      notes: {
        userId: userId.toString(),
        orderId: order._id.toString()
      }
    });

    // Update order with new attempt
    order.razorpayDetails.orderId = razorpayOrder.id;
    order.status = 'pending_payment';
    order.paymentAttempts += 1;
    await order.save();

    return sendResponse(res, 200, {
      meta: { message: "Payment retry initiated", success: true },
      data: { razorpayOrder, order }
    });

  } catch (error) {
    logPaymentEvent('RETRY_PAYMENT_ERROR', { error: error.message });
    return sendResponse(res, 500, {
      meta: { message: "Error retrying payment", success: false }
    });
  }
};

// Cleanup abandoned payments (run daily)
cron.schedule('0 0 * * *', async () => {
  try {
    // Find Razorpay orders older than 24h without matching DB orders
    const cutoff = Math.floor(Date.now() / 1000) - 86400; // 24h ago
    const orders = await razorpay.orders.all({
      from: cutoff,
      to: Math.floor(Date.now() / 1000),
      status: 'created' // Only unpaid orders
    });

    for (const order of orders.items) {
      if (order.notes?.tempOrder === "true") {
        const dbOrder = await Order.findOne({ 
          'razorpayDetails.orderId': order.id 
        });
        
        if (!dbOrder) {
          // Cancel the Razorpay order
          await razorpay.orders.cancel(order.id);
          logPaymentEvent('ABANDONED_ORDER_CLEANED', { orderId: order.id });
        }
      }
    }
  } catch (error) {
    logPaymentEvent('CLEANUP_ERROR', { error: error.message });
  }
});

// Helper function to create order from payment (for webhooks)
const createOrderFromPayment = async (payment) => {
  try {
    // Get payment details
    const paymentDetails = await razorpay.payments.fetch(payment.id);
    const orderData = {
      userId: payment.notes?.userId,
      products: [], // You'll need to get this from your session or other storage
      totalAmount: (payment.amount / 100).toFixed(2),
      deliveryAddress: {}, // Get from user profile
      status: "confirmed",
      razorpayDetails: {
        orderId: payment.order_id,
        paymentId: payment.id,
        signature: '' // Not available in webhook
      }
    };

    const order = new Order(orderData);
    await order.save();

    // Update user's orders
    if (orderData.userId) {
      await User.findByIdAndUpdate(
        orderData.userId,
        { $push: { orders: order._id } }
      );
    }

    logPaymentEvent('ORDER_CREATED_FROM_WEBHOOK', { orderId: order._id });
  } catch (error) {
    logPaymentEvent('WEBHOOK_ORDER_CREATION_ERROR', { error: error.message });
  }
};


export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;
    
    const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, {
        meta: { message: "Invalid status", success: false }
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            reason: reason || ''
          }
        }
      },
      { new: true }
    ).populate('userId');

    if (!order) {
      return sendResponse(res, 404, {
        meta: { message: "Order not found", success: false }
      });
    }

    // Send status update notification
    if (order.userId) {
      await sendEmail({
        to: order.userId.email,
        subject: `Order ${status}`,
        template: `order-${status}`,
        data: { order }
      });
    }

    return sendResponse(res, 200, {
      meta: { message: `Order marked as ${status}`, success: true },
      data: order
    });

  } catch (error) {
    logPaymentEvent('STATUS_UPDATE_ERROR', { error: error.message });
    return sendResponse(res, 500, {
      meta: { message: "Error updating order status", success: false }
    });
  }
};