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

module.exports = function (server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // Adjust to your frontend origin in production
      methods: ["GET", "POST"],
    },
  });

  // Track online users: Map username => socketId
  const onlineUsers = new Map();

  // Track typing users per room: Map roomId => Set of usernames typing
  const typingUsers = new Map();

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // User joins a room (for chat or video)
    socket.on("join_room", ({ roomId, username }) => {
      socket.join(roomId);
      onlineUsers.set(username, socket.id);
      console.log(`User '${username}' joined room: ${roomId}`);

      // Notify all in room who is online
      io.to(roomId).emit("user_online", Array.from(onlineUsers.keys()));

      // Notify others in the room that a new user joined (for video call signaling)
      socket.to(roomId).emit("user-joined", username);
    });

    // Typing status events (chat)
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

    // Chat message send and broadcast
    socket.on("send_message", async (data) => {
      const { sender, content, roomId } = data;
      try {
        const newMessage = new Message({ sender, content, roomId });
        await newMessage.save();
        io.to(roomId).emit("receive_message", newMessage);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    // WebRTC Signaling Events

    socket.on("offer", ({ roomId, sdp, sender, receiver }) => {
      // Send offer SDP to specific receiver in room
      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("offer", { sdp, sender });
      }
    });

    socket.on("answer", ({ roomId, sdp, sender, receiver }) => {
      // Send answer SDP to specific receiver
      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("answer", { sdp, sender });
      }
    });

    socket.on("ice_candidate", ({ roomId, candidate, sender, receiver }) => {
      // Send ICE candidate to specific receiver
      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("ice_candidate", { candidate, sender });
      }
    });

    // User disconnect handling
    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);

      // Find and remove user by socket ID
      for (const [username, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(username);

          // Notify all rooms and users about offline status
          io.emit("user_offline", username);

          // Remove user from all typing sets
          for (const [roomId, usersTyping] of typingUsers.entries()) {
            if (usersTyping.has(username)) {
              usersTyping.delete(username);
              io.to(roomId).emit("typing", Array.from(usersTyping));
            }
          }
          break;
        }
      }
    });
  });
};
