import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import setupRoutes from "./routes/main.routes.js";
import morgan from 'morgan';

dotenv.config();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;
const HOSTER_FRONTEND_URL = process.env.HOSTER_FRONTEND_URL;

// Initialize Express app
const app = express();

// Middleware
// app.use(morgan('combined'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS options
const corsOptions = {
  origin: [FRONTEND_URL,HOSTER_FRONTEND_URL],
  methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
  credentials: true,
};
app.use(cors(corsOptions));
console.log('cor options',corsOptions)

// Static files for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "I am coming from backend",
    success: true,
  });
});



// Create HTTP and Socket.IO servers
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL,HOSTER_FRONTEND_URL],
    methods: ["GET", "POST","PUT","DELETE","PATCH"],
    credentials: true,
  },
});

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Track rooms the socket is already in
  const userRooms = new Set();

  // Handle join room
  socket.on("joinRoom", (userId, callback) => {
    if (!userId) {
      console.error("Invalid userId for joining room:", userId);
      return callback?.({ success: false, error: "Invalid userId" });
    }

    // Prevent duplicate room joining
    if (userRooms.has(userId)) {
      return callback?.({ success: true, message: "Already in room" });
    }

    socket.join(userId);
    userRooms.add(userId);
    console.log(`User with ID ${userId} joined the room with Socket ID ${socket.id}`);

    callback?.({ success: true });
  });

  // Handle leave room
  socket.on("leaveRoom", (userId) => {
    if (userId && userRooms.has(userId)) {
      socket.leave(userId);
      userRooms.delete(userId);
      console.log(`User with ID ${userId} left the room`);
    }
  });

  // ... rest of your socket handlers
});

// Attach `io` instance to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API routes
setupRoutes(app);


// Error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "An error occurred", success: false });
});
// Start the server
server.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.error("Failed to connect to database:", error);
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  io.close(() => {
    console.log("Socket server shutting down...");
    process.exit();
  });
});
