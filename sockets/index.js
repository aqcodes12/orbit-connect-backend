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
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Track online users: { username: socketId }
  const onlineUsers = new Map();

  // Track typing status per room: { roomId: Set of usernames typing }
  const typingUsers = new Map();

  // Track room members by socket ID for WebRTC multi-peer support
  const rooms = new Map(); // roomId -> Set of socketIds

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // User joins a room with username
    socket.on("join_room", ({ roomId, username }) => {
      socket.join(roomId);

      onlineUsers.set(username, socket.id);

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(socket.id);

      console.log(`${username} joined room: ${roomId}`);

      // Notify others in room user is online
      io.to(roomId).emit("user_online", Array.from(onlineUsers.keys()));

      // Notify other peers in room of new user (for WebRTC signaling)
      socket.to(roomId).emit("user-joined", socket.id);

      // Send existing peers to newly joined user to create offers
      const otherPeers = [...rooms.get(roomId)].filter(
        (id) => id !== socket.id
      );
      otherPeers.forEach((peerId) => {
        socket.emit("user-joined", peerId);
      });
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

    // Handle chat message sending (existing logic)
    socket.on("send_message", async (data) => {
      const { sender, content, roomId } = data;
      const newMessage = new Message({ sender, content, roomId });
      await newMessage.save();
      io.to(roomId).emit("receive_message", newMessage);
    });

    // WebRTC signaling handlers for multi-peer video calls
    socket.on("offer", ({ roomId, sdp, sender, receiver }) => {
      io.to(receiver).emit("offer", { sdp, sender });
    });

    socket.on("answer", ({ roomId, sdp, sender, receiver }) => {
      io.to(receiver).emit("answer", { sdp, sender });
    });

    socket.on("ice_candidate", ({ roomId, candidate, sender, receiver }) => {
      io.to(receiver).emit("ice_candidate", { candidate, sender });
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);

      // Remove from onlineUsers by socket.id
      for (const [username, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(username);

          // Notify all rooms that user went offline
          io.emit("user_offline", username);
          break;
        }
      }

      // Remove socket from all rooms map and notify others
      rooms.forEach((set, roomId) => {
        if (set.delete(socket.id)) {
          socket.to(roomId).emit("user-left", socket.id);
          if (set.size === 0) rooms.delete(roomId);
        }
      });
    });
  });
};
