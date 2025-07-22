require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db");

// Connect MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("🌐 Orbit Connect API is running...");
});

const appRoutes = require("./routes/appRoutes");
app.use("/api", appRoutes);

// Initialize Socket.IO
require("./sockets")(server); // Loads and runs sockets/index.js

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
