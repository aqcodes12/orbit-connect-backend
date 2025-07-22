const User = require("../models/User");
const bcrypt = require("bcryptjs");

const signup = async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: "Username already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ msg: "User created", username: user.username });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    res.json({ msg: "Login successful", username: user.username });
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { signup, login };
