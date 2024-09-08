require('dotenv').config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 9000;

const users = new Map();
const messages = [];

// Serve static files (if needed)
// app.use(express.static('public'));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle custom events here
  // socket.on('customEvent', (data) => {
  //   // Handle the event
  // });

  socket.on("setOnline", (userId) => {
    users.set(userId, { id: userId, isOnline: true, socket });
    io.emit("userStatus", { userId, isOnline: true });
  });

  socket.on("sendMessage", (message) => {
    console.log(`Message in room ${message.roomId}:`, message);
    messages.push(message);
    
    // Broadcast the message to all clients in the same room
    io.to(message.roomId).emit("newMessage", message);
    
    // Send acknowledgment back to the sender
    socket.emit("messageSent", message.id);
  });

  socket.on("typing", (userId) => {
    socket.broadcast.emit("userTyping", userId);
  });

  socket.on("disconnect", () => {
    const userId = [...users.entries()].find(
      ([_, user]) => user.socket === socket
    )?.[0];
    if (userId) {
      users.delete(userId);
      io.emit("userStatus", { userId, isOnline: false });
    }
    console.log("User disconnected");
  });

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.emit('joinedRoom', roomId);
  });

  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('typing', (userId, roomId) => {
    socket.to(roomId).emit('userTyping', userId, roomId);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
