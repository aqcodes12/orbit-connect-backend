const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    members: [{ type: String }], // usernames of users who joined
    isPublic: { type: Boolean, default: true },
    createdBy: { type: String, required: true }, // username of creator/admin
  },
  { timestamps: true }
);

module.exports = mongoose.model("Channel", channelSchema);
