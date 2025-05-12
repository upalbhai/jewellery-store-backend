import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { sendResponse } from "../utils/sendResponse.js";



// Update your getNotification endpoint to handle filtering
export const getNotification = async (req, res) => {
  const { id } = req.user;
  const { page = 1, limit = 10, filter = 'all' } = req.query;

  const skip = (page - 1) * limit;
  const query = { userId: id };

  // Add read status filter if specified
  if (filter === 'read') query.read = true;
  if (filter === 'unread') query.read = false;

  try {
      const [notifications, totalNotifications] = await Promise.all([
          Notification.find(query)
              .skip(skip)
              .limit(limit)
              .sort({ createdAt: -1 }),
          Notification.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalNotifications / limit);

      return sendResponse(res, 200, {
          meta: {
              message: notifications.length ? "Notifications fetched successfully" : "No notifications found",
              success: true,
              pagination: { currentPage: page, totalPages, totalNotifications }
          },
          data: notifications
      });
  } catch (error) {
      console.error(error);
      return sendResponse(res, 500, {
          meta: { message: "Error fetching notifications", success: false }
      });
  }
};
  
  

  export const deleteNotifications = async (req, res) => {
    const { id } = req.user;
    const result = await Notification.deleteMany({ userId: id }); // Deletes all matching documents
    if (result.deletedCount === 0) {
        return sendResponse(res, 404, {
            meta: {
                message: "No notifications found for this user",
                success: false,
            },
        });
    }
    return sendResponse(res, 200, {
        meta: {
            message: `${result.deletedCount} notification(s) deleted`,
            success: true,
        },
    });
};




export const createNotification = async (req, res, io) => {
  const { notifications } = req.body;
  const { id: senderId } = req.user; // Get senderId from authenticated user

  if (!Array.isArray(notifications) || notifications.length === 0) {
    return sendResponse(res, 400, { 
      meta: { message: "Invalid notifications data.", success: false } 
    });
  }

  // Validate each notification and add senderId
  const newNotifications = notifications.map(notification => {
    if (!notification.userId || !notification.message) {
      throw new Error('Missing required fields in notification');
    }

    const notificationData = {
      userId: notification.userId,
      senderId, // Add the authenticated user's ID as sender
      message: notification.message,
      location: notification.location || null,
      read: false,
      moreDetails: notification.moreDetails || null
    };

    return notificationData;
  });

  try {
    const savedNotifications = await Notification.insertMany(newNotifications);
    
    // Send real-time notifications to recipients who are currently connected
    savedNotifications.forEach(notification => {
      const roomId = notification.userId.toString();
      
      if (io.sockets.adapter.rooms.has(roomId)) {
        try {
          const payload = {
            _id: notification._id,
            senderId: notification.senderId,
            message: notification.message,
            location: notification.location,
            moreDetails: notification.moreDetails,
            createdAt: notification.createdAt
          };

          io.to(roomId).emit("sendNotification", payload);
          console.log(`Notification sent to user ${roomId}`);
        } catch (err) {
          console.error(`Failed to emit to user ${roomId}:`, err);
        }
      } else {
        console.log(`User ${roomId} is not currently connected`);
      }
    });

    return sendResponse(res, 201, {
      meta: { message: "Notifications created and sent successfully.", success: true },
      data: savedNotifications,
    });

  } catch (error) {
    console.error("Error saving notifications:", error.message);
    return sendResponse(res, 500, {
      meta: { message: "Error while saving notifications.", success: false },
      error: error.message,
    });
  }
};


export const createAdminNotification = async (req, res, io) => {
  const { message, location, moreDetails } = req.body;
  const { id: senderId } = req.user; // ✅ Extract sender ID

  if (!message) {
    return sendResponse(res, 400, { 
      meta: { message: "Notification message is required.", success: false } 
    });
  }

  try {
    // 1. Fetch all admin users from the database
    const adminUsers = await User.find({ role: 'admin' }).select('_id');

    if (!adminUsers.length) {
      return sendResponse(res, 404, {
        meta: { message: "No admin users found.", success: false }
      });
    }

    // 2. Prepare notifications for all admins
    const adminNotifications = adminUsers.map(admin => ({
      userId: admin._id,
      senderId, // ✅ Include sender ID from the logged-in user
      message,
      location: location || null,
      moreDetails: moreDetails || null,
      createdAt: new Date(),
      read: false
    }));

    // 3. Save notifications to database
    const savedNotifications = await Notification.insertMany(adminNotifications);

    // 4. Send real-time notifications to connected admins
    const notificationPayload = {
      senderId,
      message,
      location: location || null,
      createdAt: new Date(),
    };

    if (moreDetails) {
      notificationPayload.moreDetails = moreDetails;
    }

    adminUsers.forEach(admin => {
      if (io.sockets.adapter.rooms.has(admin._id.toString())) {
        io.to(admin._id.toString()).emit("sendNotification", notificationPayload);
      }
    });

    return sendResponse(res, 201, {
      meta: { message: "Admin notifications created and sent successfully.", success: true },
      data: savedNotifications,
    });

  } catch (error) {
    console.error("Error in createAdminNotification:", error);
    return sendResponse(res, 500, {
      meta: { message: "Error while creating admin notifications.", success: false },
      error: error.message,
    });
  }
};


export const markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;
  const { id: userId } = req.user; // Authenticated user's ID

  try {
    // Find the notification and verify it belongs to the user
    const notification = await Notification.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        meta: {
          success: false,
          message: "Notification not found or doesn't belong to user"
        }
      });
    }

    // Update only if not already read
    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    return res.status(200).json({
      meta: {
        success: true,
        message: "Notification marked as read"
      },
      data: notification
    });

  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      meta: {
        success: false,
        message: "Failed to mark notification as read"
      },
      error: error.message
    });
  }
};

// Alternative version to mark multiple notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  const { id: userId } = req.user; // Authenticated user's ID

  try {
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      {
        userId,
        read: false // Only update unread notifications
      },
      { $set: { read: true } }
    );

    return res.status(200).json({
      meta: {
        success: true,
        message: `${result.modifiedCount} notifications marked as read`
      },
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return res.status(500).json({
      meta: {
        success: false,
        message: "Failed to mark notifications as read"
      },
      error: error.message
    });
  }
};


export const getUnreadNotificationCount = async (req, res) => {
  try {
    const { id } = req.user; // assuming req.user is populated by auth middleware

    const unreadCount = await Notification.countDocuments({
      userId: id,
      read: false
    });

    return res.status(200).json({
      meta: { success: true, message: 'Unread count fetched successfully' },
      data: { unreadCount }
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({
      meta: { success: false, message: 'Failed to fetch unread notification count' },
      error: error.message
    });
  }
};

// controllers/notification.controller.js
export const deleteNotificationById = async (req, res) => {
  const { notificationId } = req.params;
  const { id: userId } = req.user; // Authenticated user's ID

  try {
    // Find and verify the notification belongs to the user
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return sendResponse(res, 404, {
        meta: {
          success: false,
          message: "Notification not found or doesn't belong to user"
        }
      });
    }

    return sendResponse(res, 200, {
      meta: {
        success: true,
        message: "Notification deleted successfully"
      },
      data: notification
    });

  } catch (error) {
    console.error("Error deleting notification:", error);
    return sendResponse(res, 500, {
      meta: {
        success: false,
        message: "Failed to delete notification"
      },
      error: error.message
    });
  }
};