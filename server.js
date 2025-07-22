require("dotenv").config();
const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
const connectDB = require("./config/db");

// Connect MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("🌐 Orbit Connect API is running...");
});

const appRoutes = require("./routes/appRoutes");
app.use("/api", appRoutes);

// Use a variable to hold the server instance (HTTP or HTTPS)
let server;

if (process.env.DEPLOY_ENV === "prod") {
  // Read SSL certificate and key
  const options = {
    cert: fs.readFileSync(process.env.SSL_CRT_PATH),
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
  };

  server = https.createServer(options, app);

  server.listen(process.env.PORT || 443, () => {
    console.log(`🚀 HTTPS Server running on port ${process.env.PORT || 443}`);
  });
} else {
  // Default to HTTP server for local/dev
  server = http.createServer(app);

  server.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 HTTP Server running on port ${process.env.PORT || 5000}`);
  });
}

// Initialize Socket.IO with the server (either http or https)
require("./sockets")(server);
