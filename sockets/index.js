// const { Server } = require("socket.io");
// const Message = require("../models/Message");

// module.exports = function (server) {
//   const io = new Server(server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"],
//     },
//   });

//   // Track online users: { username: socketId }
//   const onlineUsers = new Map();

//   // Track typing status per room: { roomId: Set of usernames typing }
//   const typingUsers = new Map();

//   io.on("connection", (socket) => {
//     console.log("🟢 Socket connected:", socket.id);

//     // User joins a room with username
//     socket.on("join_room", ({ roomId, username }) => {
//       socket.join(roomId);
//       onlineUsers.set(username, socket.id);
//       console.log(`${username} joined room: ${roomId}`);

//       // Notify others in room user is online
//       io.to(roomId).emit("user_online", Array.from(onlineUsers.keys()));
//     });

//     // Handle typing events
//     socket.on("typing", ({ roomId, username }) => {
//       if (!typingUsers.has(roomId)) typingUsers.set(roomId, new Set());
//       typingUsers.get(roomId).add(username);
//       io.to(roomId).emit("typing", Array.from(typingUsers.get(roomId)));
//     });

//     socket.on("stop_typing", ({ roomId, username }) => {
//       if (typingUsers.has(roomId)) {
//         typingUsers.get(roomId).delete(username);
//         io.to(roomId).emit("typing", Array.from(typingUsers.get(roomId)));
//       }
//     });

//     // Handle message sending (existing logic)
//     socket.on("send_message", async (data) => {
//       const { sender, content, roomId } = data;
//       const newMessage = new Message({ sender, content, roomId });
//       await newMessage.save();
//       io.to(roomId).emit("receive_message", newMessage);
//     });

//     socket.on("offer", (data) => {
//       const { roomId, sdp, sender } = data;
//       socket.to(roomId).emit("offer", { sdp, sender });
//     });

//     socket.on("answer", (data) => {
//       const { roomId, sdp, sender } = data;
//       socket.to(roomId).emit("answer", { sdp, sender });
//     });

//     socket.on("ice_candidate", (data) => {
//       const { roomId, candidate, sender } = data;
//       socket.to(roomId).emit("ice_candidate", { candidate, sender });
//     });

//     socket.on("disconnect", () => {
//       console.log("🔴 Socket disconnected:", socket.id);

//       // Remove user from onlineUsers map by socket.id
//       for (const [username, id] of onlineUsers.entries()) {
//         if (id === socket.id) {
//           onlineUsers.delete(username);
//           // Notify all rooms that user went offline
//           io.emit("user_offline", username);
//           break;
//         }
//       }
//     });
//   });
// };

const { Server } = require("socket.io");
const Message = require("../models/Message");

// Export function to attach Socket.IO to HTTP server
module.exports = function (server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const onlineUsers = new Map(); // { username: socketId }
  const typingUsers = new Map(); // { roomId: Set(username) }
  const rooms = {}; // { roomId: [socketId, ...] }

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // 🟨 User joins a chat room (used for messaging + video)
    socket.on("join_room", ({ roomId, username }) => {
      socket.join(roomId);
      onlineUsers.set(username, socket.id);

      // Track socket in room
      if (!rooms[roomId]) rooms[roomId] = [];
      rooms[roomId].push(socket.id);

      console.log(`${username} joined room: ${roomId}`);

      // 🔄 Notify new user about others in the room (for video call setup)
      const otherUsers = rooms[roomId].filter((id) => id !== socket.id);
      socket.emit("all-users", otherUsers);

      // 🔔 Notify existing users that a new user joined
      socket.to(roomId).emit("user-joined", socket.id);

      // 📡 Update online user list for the room (chat presence)
      io.to(roomId).emit("user_online", Array.from(onlineUsers.keys()));
    });

    // 🟨 Chat typing indicator
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

    // 🟨 Chat message handler
    socket.on("send_message", async (data) => {
      const { sender, content, roomId } = data;
      const newMessage = new Message({ sender, content, roomId });
      await newMessage.save();
      io.to(roomId).emit("receive_message", newMessage);
    });

    // 🟨 WebRTC signaling for group video call using simple-peer
    socket.on("signal", ({ to, signal }) => {
      io.to(to).emit("signal", { from: socket.id, signal });
    });

    // 🟥 User disconnects
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);

      // Remove from online users
      for (const [username, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(username);
          io.emit("user_offline", username);
          break;
        }
      }

      // Remove from all rooms
      for (const roomId in rooms) {
        rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);

        // Notify others in the room that user left (for video cleanup)
        socket.to(roomId).emit("user-disconnected", socket.id);

        // Clean up empty rooms
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }
      }
    });
  });
};
