import ConnectionRequest from "../models/connectionRequest.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { sendConnectionAcceptedEmail } from "../emails/emailHandlers.js";

// Function to send a connection request
export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const { senderId } = req.user;

    // Check if user is trying to connect with themselves
    if (userId.toString() === senderId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot send a connection request to yourself" });
    }

    // Check if already connected
    if (req.user.connections.includes(userId)) {
      return res.status(400).json({
        message: "You already have a connection with this user",
      });
    }

    // Check for existing pending connection request
    const existingRequest = await ConnectionRequest.findOne({
      sender: senderId,
      recipient: userId,
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You already have a pending connection request" });
    }

    // Create new connection request
    const newRequest = new ConnectionRequest({
      sender: senderId,
      recipient: userId,
      status: "pending", // Ensure the status is set to pending
    });

    await newRequest.save();
    res.status(201).json({ message: "Connection request sent successfully" });
  } catch (error) {
    console.error("Error in sendConnectionRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to accept a connection request
export const acceptConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId)
      .populate("sender", "name username ")
      .populate("recipient", "name username");

    // Check if the connection request exists
    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    // Check if the current user is authorized to accept this request
    if (request.recipient.toString() !== userId.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to accept this request" });
    }

    // Check if the request is already processed
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request already accepted or rejected" });
    }

    // Update the status of the request to accepted
    request.status = "accepted";
    await request.save();

    // Update connections for both users
    await User.findByIdAndUpdate(request.sender._id, {
      $addToSet: { connections: userId },
    });
    await User.findByIdAndUpdate(userId, {
      $addToSet: { connections: request.sender._id },
    });

    // Create a notification for the sender
    const notification = new Notification({
      recipient: request.sender._id,
      type: "connectionAccepted",
      relatedUser: userId,
    });

    await notification.save();

    res
      .status(200)
      .json({ message: "Connection request accepted successfully" });

    // Send an email notification about the connection acceptance
    const senderEmail = request.sender.email;
    const senderName = request.sender.name;
    const recipientName = request.recipient.name;
    const profileUrl =
      process.env.FRONTEND_URL + "/profile/" + request.recipient.username;

    try {
      await sendConnectionAcceptedEmail(
        senderEmail,
        senderName,
        recipientName,
        profileUrl
      );
    } catch (error) {
      console.error("Error in sending email:", error.message);
    }
  } catch (error) {
    console.error("Error in acceptConnectionRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to reject a connection request
export const rejectConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);

    // Check if the current user is authorized to reject this request
    if (request.recipient.toString() !== userId.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to reject this request" });
    }

    // Check if the request is already processed
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request already accepted or rejected" });
    }

    // Update the status of the request to rejected
    request.status = "rejected";
    await request.save();

    res
      .status(200)
      .json({ message: "Connection request rejected successfully" });
  } catch (error) {
    console.error("Error in rejectConnectionRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to get pending connection requests
export const getConnectionsRequest = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await ConnectionRequest.find({
      recipient: userId,
      status: "pending",
    }).populate("sender", "name username email");

    res.status(200).json({ requests });
  } catch (error) {
    console.error("Error in getConnectionsRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to get user's connections
export const getConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate(
      "connections",
      "name username profilePicture headline connections"
    );

    res.json(user.connections);
  } catch (error) {
    console.error("Error in getConnections:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to get a specific user's connections
export const getUserConnections = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).populate(
      "connections",
      "name username profilePicture headline connections"
    );

    res.json(user.connections);
  } catch (error) {
    console.error("Error in getUserConnections:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to remove a connection
export const removeConnection = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    await User.findByIdAndUpdate(myId, {
      $pull: { connections: userId },
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { connections: myId },
    });

    res.status(200).json({ message: "Connection removed successfully" });
  } catch (error) {
    console.error("Error in removeConnection:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Function to get the connection status between users
export const getConnectionStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = req.user;
    // Check if users are already connected
    if (currentUser.connections.includes(targetUserId)) {
      res.status(200).json({ status: "connected" });
    }

    // Check for pending connection requests
    const pendingRequest = await ConnectionRequest.findOne({
      $or: [
        { sender: targetUserId, recipient: currentUserId },
        { sender: currentUserId, recipient: targetUserId },
      ],
      status: "pending",
    });
    if (pendingRequest) {
      // Determine if the current user sent or received the request
      if (pendingRequest.sender.toString() === currentUserId.toString()) {
        return res.status(200).json({ status: "pending" });
      } else {
        return res
          .status(200)
          .json({ status: "received", requestId: pendingRequest._id });
      }
    }
    // If no connection or pending request found
    return res.status(200).json({ status: "not connected" });
  } catch (error) {
    console.error("Error in getConnectionStatus:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
