const Message = require("../models/Message");

const getMessagesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

const createMessage = async (req, res) => {
  try {
    const { sender, content, roomId } = req.body;
    const newMessage = new Message({ sender, content, roomId });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Failed to create message" });
  }
};

module.exports = {
  getMessagesByRoom,
  createMessage,
};
