const express = require("express");
const router = express.Router();
const {
  createChannel,
  getPublicChannels,
  joinChannel,
  leaveChannel,
  getChannelById,
} = require("../controllers/channelController");

router.post("/", createChannel);
router.get("/", getPublicChannels);
router.get("/:id", getChannelById);
router.post("/join", joinChannel);
router.post("/leave", leaveChannel);

module.exports = router;
