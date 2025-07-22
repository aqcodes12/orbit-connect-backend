const Channel = require("../models/Channel");

// Create channel (public by default)
const createChannel = async (req, res) => {
  const { name, description, createdBy } = req.body;

  if (!name || !createdBy) {
    return res.status(400).json({ msg: "Missing required fields" });
  }

  try {
    const exists = await Channel.findOne({ name });
    if (exists)
      return res.status(400).json({ msg: "Channel name already exists" });

    const channel = new Channel({
      name,
      description,
      createdBy,
      members: [createdBy],
    });
    await channel.save();
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ msg: "Failed to create channel" });
  }
};

// Get all public channels
const getPublicChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ isPublic: true });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ msg: "Failed to fetch channels" });
  }
};

// Join channel
const joinChannel = async (req, res) => {
  const { channelId, username } = req.body;
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ msg: "Channel not found" });

    if (!channel.members.includes(username)) {
      channel.members.push(username);
      await channel.save();
    }
    res.json(channel);
  } catch (error) {
    res.status(500).json({ msg: "Failed to join channel" });
  }
};

// Leave channel
const leaveChannel = async (req, res) => {
  const { channelId, username } = req.body;
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ msg: "Channel not found" });

    channel.members = channel.members.filter((u) => u !== username);
    await channel.save();
    res.json(channel);
  } catch (error) {
    res.status(500).json({ msg: "Failed to leave channel" });
  }
};

const getChannelById = async (req, res) => {
  const { id } = req.params;
  try {
    const channel = await Channel.findById(id);
    if (!channel) return res.status(404).json({ msg: "Channel not found" });
    res.json(channel);
  } catch (error) {
    res.status(500).json({ msg: "Failed to fetch channel" });
  }
};

module.exports = {
  createChannel,
  getPublicChannels,
  joinChannel,
  leaveChannel,
  getChannelById,
};
