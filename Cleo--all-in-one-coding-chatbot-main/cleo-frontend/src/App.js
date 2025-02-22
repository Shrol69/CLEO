import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      myVideo.current.srcObject = currentStream;
    });

    socket.on("me", (id) => setMe(id));

    socket.on("callIncoming", ({ from, signal }) => {
      setReceivingCall(true);
      setCaller(from);
      setCallerSignal(signal);
    });

    socket.on("receiveMessage", ({ sender, message }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    socket.on("receiveAIResponse", ({ message }) => {
      setAiMessages((prev) => [...prev, { sender: "Cleo (AI)", message }]);
      setLoadingAI(false);
    });

    socket.on("userDisconnected", (id) => {
      if (id === caller) {
        leaveCall();
      }
    });

    return () => {
      socket.off("me");
      socket.off("callIncoming");
      socket.off("receiveMessage");
      socket.off("receiveAIResponse");
      socket.off("userDisconnected");
    };
  }, []);

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: me });
    });

    peer.on("stream", (userStream) => {
      userVideo.current.srcObject = userStream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (userStream) => {
      userVideo.current.srcObject = userStream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) connectionRef.current.destroy();
    window.location.reload();
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { sender: me, message });
      setMessages((prev) => [...prev, { sender: "Me", message }]);
      setMessage("");
    }
  };

  const sendAiMessage = () => {
    if (aiInput.trim()) {
      setAiMessages((prev) => [...prev, { sender: "Me", message: aiInput }]);
      setLoadingAI(true);
      socket.emit("sendMessage", { sender: me, message: aiInput });
      setAiInput("");
    }
  };

  return (
    <div className="container">
      <h1>Chat & Video Call App</h1>

      {/* Video Call Section */}
      <div className="video-section">
        <div className="video">
          <h3>My Video</h3>
          <video ref={myVideo} playsInline muted autoPlay />
        </div>
        <div className="video">
          <h3>Partner's Video</h3>
          {callAccepted && !callEnded && <video ref={userVideo} playsInline autoPlay />}
        </div>
      </div>

      {/* Call Controls */}
      <div className="call-controls">
        <h3>Your ID: {me}</h3>
        <button onClick={() => navigator.clipboard.writeText(me)}>Copy ID</button>
        <input type="text" placeholder="Enter ID to call" onChange={(e) => setIdToCall(e.target.value)} />
        <button onClick={() => callUser(idToCall)}>Call</button>
        {receivingCall && !callAccepted && (
          <div>
            <h4>Incoming Call...</h4>
            <button onClick={answerCall}>Answer</button>
          </div>
        )}
        {callAccepted && !callEnded && <button onClick={leaveCall}>End Call</button>}
      </div>

      {/* Chat Section */}
      <div className="chat-section">
        <h3>Chat</h3>
        <div className="chat-box">
          {messages.map((msg, index) => (
            <p key={index}>
              <strong>{msg.sender}</strong>: {msg.message}
            </p>
          ))}
        </div>
        <input 
          type="text" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Type a message..." 
        />
        <button onClick={sendMessage}>Send</button>
      </div>

      {/* AI Chat Section */}
      <div className="ai-chat-section">
        <h3>💡 Talk to Cleo (AI)</h3>
        <div className="chat-box">
          {aiMessages.map((msg, index) => (
            <p key={index}>
              <strong style={{ color: msg.sender === "Cleo (AI)" ? "blue" : "black" }}>
                {msg.sender}
              </strong>: {msg.message}
            </p>
          ))}
          {loadingAI && <p style={{ color: "gray" }}><strong>Cleo (AI)</strong>: Typing...</p>}
        </div>
        <input 
          type="text" 
          value={aiInput} 
          onChange={(e) => setAiInput(e.target.value)} 
          placeholder="Ask something..." 
        />
        <button onClick={sendAiMessage}>Ask AI</button>
      </div>
    </div>
  );
}

export default App;
