const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    members: [{ type: String, required: true }], // array of usernames
    admin: { type: String, required: true }, // username of group creator/admin
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);
