import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";

// Fetch suggested connections for the current user
export const getSuggestedConnections = async (req, res) => {
  try {
    // Get the current user's connections
    const currentUser = await User.findById(req.user._id).select("connections");

    // Find users who are not in the current user's connections
    const suggestedUser = await User.find({
      _id: {
        $ne: req.user._id, // Exclude the current user
        $nin: currentUser.connections, // Exclude already connected users
      },
    })
      .select("name username profilePicture headline") // Select specific fields to return
      .limit(3); // Limit the number of suggested users to 3

    res.json(suggestedUser); // Return the suggested users
  } catch (error) {
    console.error("Error in getSuggestedConnections:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Fetch a public profile based on username
export const getPublicProfile = async (req, res) => {
  try {
    // Find a user by their username, excluding password
    const user = await User.findOne({ username: req.params.username }).select(
      "-password"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" }); // Handle user not found case
    }
    res.json(user); // Return the user profile
  } catch (error) {
    console.error("Error in getPublicProfile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update the current user's profile
export const updateProfile = async (req, res) => {
  try {
    // Define allowed fields for profile update
    const allowedFields = [
      "name",
      "username",
      "headline",
      "about",
      "location",
      "profilePicture",
      "bannerImg",
      "skills",
      "experience",
      "education",
    ];

    const updatedData = {}; // Initialize object to hold updated fields

    // Populate updatedData with fields present in the request body
    for (const field of allowedFields) {
      if (req.body[field]) {
        updatedData[field] = req.body[field];
      }
    }

    // Upload new profile picture if provided and update URL
    if (req.body.profilePicture) {
      const result = await cloudinary.uploader.upload(req.body.profilePicture);
      updatedData.profilePicture = result.secure_url;
    }

    // Upload new banner image if provided and update URL
    if (req.body.bannerImg) {
      const result = await cloudinary.uploader.upload(req.body.bannerImg);
      updatedData.bannerImg = result.secure_url;
    }

    // Update the user with the new data, excluding the password
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updatedData },
      { new: true }
    ).select("-password");

    res.json(user); // Return the updated user profile
  } catch (error) {
    console.error("Error in updateProfile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
