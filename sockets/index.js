const { Server } = require("socket.io");
const Message = require("../models/Message");

module.exports = function (server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Track online users: { username: socketId }
  const onlineUsers = new Map();

  // Track typing status per room: { roomId: Set of usernames typing }
  const typingUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // User joins a room with username
    socket.on("join_room", ({ roomId, username }) => {
      socket.join(roomId);
      onlineUsers.set(username, socket.id);
      console.log(`${username} joined room: ${roomId}`);

      // Notify others in room user is online
      io.to(roomId).emit("user_online", Array.from(onlineUsers.keys()));
    });

    // Handle typing events
    socket.on("typing", ({ roomId, username }) => {
      if (!typingUsers.has(roomId)) typingUsers.set(roomId, new Set());
      typingUsers.get(roomId).add(username);
      io.to(roomId).emit("typing", Array.from(typingUsers.get(roomId)));
    });

    socket.on("stop_typing", ({ roomId, username }) => {
      if (typingUsers.has(roomId)) {
        typingUsers.get(roomId).delete(username);
        io.to(roomId).emit("typing", Array.from(typingUsers.get(roomId)));
      }
    });

    // Handle message sending (existing logic)
    socket.on("send_message", async (data) => {
      const { sender, content, roomId } = data;
      const newMessage = new Message({ sender, content, roomId });
      await newMessage.save();
      io.to(roomId).emit("receive_message", newMessage);
    });

    socket.on("offer", (data) => {
      const { roomId, sdp, sender } = data;
      socket.to(roomId).emit("offer", { sdp, sender });
    });

    socket.on("answer", (data) => {
      const { roomId, sdp, sender } = data;
      socket.to(roomId).emit("answer", { sdp, sender });
    });

    socket.on("ice_candidate", (data) => {
      const { roomId, candidate, sender } = data;
      socket.to(roomId).emit("ice_candidate", { candidate, sender });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);

      // Remove user from onlineUsers map by socket.id
      for (const [username, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(username);
          // Notify all rooms that user went offline
          io.emit("user_offline", username);
          break;
        }
      }
    });
  });
};
