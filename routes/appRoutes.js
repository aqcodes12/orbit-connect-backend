const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const messageRoutes = require("./messageRoutes");
const userRoutes = require("./userRoutes");
const groupRoutes = require("./groupRoutes");
const channelRoutes = require("./channelRoutes");

router.use("/channels", channelRoutes);
router.use("/groups", groupRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/messages", messageRoutes);

module.exports = router;
