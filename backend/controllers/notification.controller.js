import Notification from "../models/notification.model.js";

// Function to retrieve notifications for the current user
export const getUserNotifications = async (req, res) => {
  try {
    // Find notifications for the logged-in user, sorted by creation date
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("relatedUser", "name username profilePicture") // Populate related user details
      .populate("relatedPost", "content image"); // Populate related post details

    // Return the notifications as a response
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error in getUserNotifications:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to mark a specific notification as read
export const markNotificationAsRead = async (req, res) => {
  const notificationId = req.params.id; // Extract the notification ID from the request parameters
  try {
    // Update the notification to mark it as read for the current user
    const notification = await Notification.findByIdAndUpdate(
      { _id: notificationId, recipient: req.user._id },
      { read: true }, // Set the read status to true
      { new: true } // Return the updated notification
    );

    // Return the updated notification as a response
    res.status(200).json(notification);
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to delete a specific notification
export const deleteNotification = async (req, res) => {
  const notificationId = req.params.id; // Extract the notification ID from the request parameters
  try {
    // Delete the specified notification for the current user
    await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user._id,
    });

    // Return a success message as a response
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error in deleteNotification:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
