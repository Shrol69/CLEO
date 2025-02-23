const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const users = {}; // Store connected users (socketId -> userId)

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  // Send the unique socket ID to the client
  socket.emit("me", socket.id);
  users[socket.id] = socket.id; // Save user

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    delete users[socket.id]; // Remove user from tracking
    io.emit("userDisconnected", socket.id);
  });

  // 📞 Handle Call Initiation
  socket.on("callUser", ({ userToCall, signalData, from }) => {
    console.log(`📞 Call request from ${from} to ${userToCall}`);

    if (users[userToCall]) {
      io.to(userToCall).emit("callIncoming", { from, signal: signalData });
    } else {
      console.log("🚨 User not found:", userToCall);
      socket.emit("callError", { message: "User not found!" });
    }
  });

  // ✅ Handle Call Acceptance
  socket.on("answerCall", ({ signal, to }) => {
    console.log(`✅ Call accepted by ${socket.id}, sending signal to ${to}`);

    if (users[to]) {
      io.to(to).emit("callAccepted", signal);
    } else {
      console.log("🚨 Error: Caller not found.");
      socket.emit("callError", { message: "Caller not found!" });
    }
  });

  // 💬 Handle Chat Messages
  socket.on("sendMessage", ({ sender, message }) => {
    console.log(`💬 Message from ${sender}: ${message}`);
    io.emit("receiveMessage", { sender, message });
  });

  // 🤖 AI Chat Simulation (Replace with AI API later)
  socket.on("sendAIMessage", ({ sender, message }) => {
    console.log(`🤖 AI Message from ${sender}: ${message}`);
    setTimeout(() => {
      io.emit("receiveAIResponse", { message: `AI Response: ${message}` });
    }, 2000);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
