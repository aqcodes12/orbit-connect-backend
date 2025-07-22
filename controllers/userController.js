const User = require("../models/User");

const getUsers = async (req, res) => {
  try {
    const currentUsername = req.query.exclude; // Pass username to exclude from list
    const users = await User.find(
      currentUsername ? { username: { $ne: currentUsername } } : {}
    ).select("username -_id"); // Only username field
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

module.exports = { getUsers };
