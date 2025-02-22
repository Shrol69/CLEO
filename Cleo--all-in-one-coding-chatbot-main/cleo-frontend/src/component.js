import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

// Connect to backend
const socket = io("http://localhost:5000");

const VideoChat = () => {
  const [me, setMe] = useState("24452445"); // Fixed ID
  const [call, setCall] = useState({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      });

    // No need to setMe dynamically, as it's fixed to "24452445"
    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivedCall: true, from, name: callerName, signal });
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: me });
    });

    peer.on("stream", (userStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = userStream;
      }
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
      socket.emit("answerCall", { signal: data, to: call.from });
    });

    peer.on("stream", (userStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = userStream;
      }
    });

    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const endCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setCallAccepted(false);
    setCall({});
  };

  return (
    <div>
      <h1>Video Chat App</h1>

      {/* Step 7: Display and Copy User ID */}
      <div>
        <h3>Your ID:</h3>
        <p>{me}</p>
        <button onClick={() => navigator.clipboard.writeText(me)}>Copy ID</button>
      </div>

      <h3>My Video</h3>
      <video ref={myVideo} playsInline autoPlay style={{ width: "300px" }} />

      <h3>Partner's Video</h3>
      {callAccepted && !callEnded && (
        <video ref={userVideo} playsInline autoPlay style={{ width: "300px" }} />
      )}

      <div>
        <input type="text" placeholder="Enter ID to call" id="callerId" />
        <button onClick={() => callUser(document.getElementById("callerId").value)}>Call</button>

        {call.isReceivedCall && !callAccepted && (
          <div>
            <h4>{call.name} is calling...</h4>
            <button onClick={answerCall}>Answer</button>
          </div>
        )}

        {callAccepted && !callEnded && (
          <button onClick={endCall}>End Call</button>
        )}
      </div>
    </div>
  );
};

export default VideoChat;
