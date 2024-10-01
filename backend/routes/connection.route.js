import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getConnectionsRequest,
  getUserConnections,
  removeConnection,
  getConnectionStatus,
} from "../controllers/connection.controller.js";

const router = express.Router();

router.post("/request/:userId", protectRoute, sendConnectionRequest);
router.put("/accept/:requestId", protectRoute, acceptConnectionRequest);
router.put("/reject/:requestId", protectRoute, rejectConnectionRequest);
// Get all connections request for the current user
router.get("/requests", protectRoute, getConnectionsRequest);
// Get all connections for a user
router.get("/", protectRoute, getUserConnections);
router.delete("/:userId", protectRoute, removeConnection);
router.get("/status/:userId", protectRoute, getConnectionStatus);

export default router;
