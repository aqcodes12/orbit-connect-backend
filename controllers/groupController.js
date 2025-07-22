const Group = require("../models/Group");

// Create a new group
const createGroup = async (req, res) => {
  const { name, members, admin } = req.body;

  if (!name || !members || !admin) {
    return res.status(400).json({ msg: "Missing required fields" });
  }

  try {
    const newGroup = new Group({ name, members, admin });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ msg: "Failed to create group" });
  }
};

// Get groups for a user
const getGroupsForUser = async (req, res) => {
  const { username } = req.params;

  try {
    const groups = await Group.find({ members: username });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ msg: "Failed to fetch groups" });
  }
};

const getGroupById = async (req, res) => {
  const { id } = req.params;
  try {
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ msg: "Group not found" });
    res.json(group);
  } catch (error) {
    res.status(500).json({ msg: "Failed to fetch group" });
  }
};

module.exports = { createGroup, getGroupsForUser, getGroupById };
