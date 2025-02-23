const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ✅ Check if the backend server is running
app.get("/", (req, res) => {
  res.send("✅ Cleo API is working with Gemini!");
});

// ✅ Google Gemini API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro";

// ✅ Function to get AI response from Gemini
async function getGeminiResponse(userMessage) {
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: userMessage }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
      throw new Error("⚠️ No AI response received from Gemini");
    }

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("🚨 Gemini API Error:", error.response?.data || error.message);
    return "Sorry, I couldn't process that.";
  }
}

// Store chat history for AI context
const chatHistory = {};

// ✅ WebSocket Connection
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  socket.emit("me", socket.id);

  // ✅ Handle Call Events
  socket.on("callUser", ({ userToCall, signalData, from }) => {
    console.log(`📞 Call from ${from} to ${userToCall}`);
    io.to(userToCall).emit("callIncoming", { signal: signalData, from });
  });

  socket.on("answerCall", (data) => {
    console.log(`✅ Call accepted by ${data.to}`);
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    io.emit("userDisconnected", socket.id);
  });

  // ✅ Handle Real-time Chat
  socket.on("sendMessage", async ({ sender, message }) => {
    console.log(`💬 Message from ${sender}: ${message}`);
    io.emit("receiveMessage", { sender, message });
  });

  // ✅ AI Chat Integration
  socket.on("sendAIMessage", async ({ sender, message }) => {
    console.log(`🤖 AI request from ${sender}: ${message}`);

    if (!chatHistory[sender]) {
      chatHistory[sender] = [];
    }

    chatHistory[sender].push({ sender, message });

    const aiResponse = await getGeminiResponse(message);
    chatHistory[sender].push({ sender: "Cleo (AI)", message: aiResponse });

    io.emit("receiveAIResponse", { sender: "Cleo (AI)", message: aiResponse });
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} with Gemini AI`));
