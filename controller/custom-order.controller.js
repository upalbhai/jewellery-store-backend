import { CustomOrder } from "../models/custom-order.model.js";
import { sendResponse } from "../utils/sendResponse.js";


export const createCustomOrder = async(req,res)=>{
    try {
        const {message} = req.body;
        const {id} = req.user;
        if (!req.files || req.files.length === 0) {
            return sendResponse(res, 400, {
              meta: {
                message: "At least one image is required",
                success: false
              }
            });
          }
          const imagePaths = req.files.map(file => file.path);          const custom_order = new CustomOrder({
            images: imagePaths,
            message,
            userId: id
          })
          await custom_order.save();
          return sendResponse(res, 201, {
            meta: {
              message: "Your custom order request sent successfully",
              success: true
            },
            data: custom_order
          });
    } catch (error) {
        console.error(error);
              return sendResponse(res, 500, {
                meta: {
                  message: "An error occurred while fetching notifications",
                  success: false,
                  status: 500,
                },
              });
    }
}

export const getCustomOrder = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    // Convert to numbers
    page = parseInt(page);
    limit = parseInt(limit);

    // Ensure valid page & limit
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    // Create search filter (if search query is provided)
    const searchFilter = search
      ? { message: { $regex: search, $options: "i" } } // Case-insensitive search
      : {};

    // Get total count of matching orders
    const totalOrders = await CustomOrder.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalOrders / limit);

    // Fetch filtered & paginated orders
    const orders = await CustomOrder.find(searchFilter)
      .populate("userId","name email phoneNumber")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    if (!orders.length) {
      return sendResponse(res, 404, {
        meta: {
          message: "No custom orders found",
          success: false,
        },
      });
    }

    return sendResponse(res, 200, {
      meta: {
        message: "Custom orders fetched successfully",
        success: true,
        currentPage: page,
        totalOrders,
        totalPages,
      },
      data: orders,
    });
  } catch (error) {
    console.error("❌ Error fetching custom orders:", error);
    return sendResponse(res, 500, {
      meta: {
        message: "An error occurred while fetching custom orders",
        success: false,
        status: 500,
      },
    });
  }
};

export const getCustomOrderById = async(req,res)=>{
  try {
    const {id} = req.params;
    const order = await CustomOrder.findById(id).populate("userId","name email phoneNumber");
    if (!order) {
      return sendResponse(res, 404, {
        meta: {
          message: "Custom order not found",
          success: false,
        }
      })
    }
    return sendResponse(res, 200, {
      meta: {
        message: "Custom order fetched successfully",
        success: true,
      },
      data: order
    })
  } catch (error) {
    console.error("❌ Error fetching custom orders:", error);
    return sendResponse(res, 500, {
      meta: {
        message: "An error occurred while fetching custom orders",
        success: false,
        status: 500,
      },
    });
  }
}