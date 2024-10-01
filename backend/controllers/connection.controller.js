import ConnectionRequest from "../models/connectionRequest.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { sendConnectionAcceptedEmail } from "../emails/emailHandlers.js";

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const { senderId } = req.user;

    if (userId.toString() === senderId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot send a connection request to yourself" });
    }

    if (req.user.connections.includes(userId)) {
      return res.status(400).json({
        message: "You already have a connection with this user",
      });
    }

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

    const newRequest = new ConnectionRequest({
      sender: senderId,
      recipient: userId,
      status: "pending",
    });

    await newRequest.save();
    res.status(201).json({ message: "Connection request sent successfully" });
  } catch (error) {
    console.error("Error in sendConnectionRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId)
      .populate("sender", "name username ")
      .populate("recipient", "name username");

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    if (request.recipient.toString() !== userId.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to accept this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request already accepted or rejected" });
    }

    request.status = "accepted";
    await request.save();

    await User.findByIdAndUpdate(request.sender._id, {
      $addToSet: { connections: userId },
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { connections: request.sender._id },
    });

    const notification = new Notification({
      recipient: request.sender._id,
      type: "connectionAccepted",
      relatedUser: userId,
    });

    await notification.save();

    res
      .status(200)
      .json({ message: "Connection request accepted successfully" });

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
    console.error("Error in getConnectionsRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);

    if (request.recipient.toString() !== userId.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to reject this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Request already accepted or rejected" });
    }

    request.status = "rejected";
    await request.save();

    res
      .status(200)
      .json({ message: "Connection request rejected successfully" });
  } catch (error) {
    console.error("Error in getConnectionsRequest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

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

export const getConnectionStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = req.user;
    if (currentUser.connections.includes(targetUserId)) {
      res.status(200).json({ status: "connected" });
    }

    const pendingRequest = await ConnectionRequest.findOne({
      $or: [
        { sender: targetUserId, recipient: currentUserId },
        { sender: currentUserId, recipient: targetUserId },
      ],
      status: "pending",
    });

    if (pendingRequest) {
      if (pendingRequest.sender.toString() === currentUserId.toString()) {
        res.status(200).json({ status: "pending" });
      } else {
        res
          .status(200)
          .json({ status: "received", requestId: pendingRequest._id });
      }
    }

    res.status(200).json({ status: "not connected" });
  } catch (error) {
    console.error("Error in getConnectionsStatus:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
