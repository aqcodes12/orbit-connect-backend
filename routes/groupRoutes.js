const express = require("express");
const router = express.Router();
const {
  createGroup,
  getGroupsForUser,
  getGroupById,
} = require("../controllers/groupController");

// POST /api/groups — create a new group
router.post("/", createGroup);

// Get group by ID
router.get("/detail/:id", getGroupById);

// Get groups for a user
router.get("/user/:username", getGroupsForUser);

module.exports = router;
