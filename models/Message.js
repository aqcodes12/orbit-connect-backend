const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    content: { type: String, required: true },
    roomId: { type: String, required: true }, // can be channel or DM
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Message", messageSchema);
