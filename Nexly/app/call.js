import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ─── WebRTC implementation (disabled — requires native build) ────────────────
// To re-enable:
//   1. Run: npx expo install react-native-webrtc
//   2. Set "newArchEnabled": false in app.json
//   3. Run: npx expo run:android
//   4. Uncomment everything below and delete the stub screen above it
//
// import {
//   RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices,
// } from "react-native-webrtc";
// import { io } from "socket.io-client";
// import { BASE_URL } from "../config";
//
// const ICE_SERVERS = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//   ],
// };
//
// export default function CallScreen() {
//   const { username, fname, friend, friendFname, isCaller, offer } = useLocalSearchParams();
//   const router = useRouter();
//   const calling = isCaller === "true";
//   const [callStatus, setCallStatus] = useState(calling ? "Calling..." : "Connecting...");
//   const [muted, setMuted] = useState(false);
//   const [connected, setConnected] = useState(false);
//   const [duration, setDuration] = useState(0);
//   const socketRef = useRef(null);
//   const pcRef = useRef(null);
//   const localStreamRef = useRef(null);
//   const pendingCandidatesRef = useRef([]);
//   const remoteDescSetRef = useRef(false);
//   const timerRef = useRef(null);
//   const cleanedUpRef = useRef(false);
//
//   useEffect(() => { startCall(); return () => teardown(false); }, []);
//
//   const startCall = async () => {
//     const socket = io(BASE_URL, { transports: ["websocket"] });
//     socketRef.current = socket;
//     socket.emit("join", username);
//     let stream;
//     try {
//       stream = await mediaDevices.getUserMedia({ audio: true, video: false });
//       localStreamRef.current = stream;
//     } catch {
//       Alert.alert("Microphone Error", "Could not access microphone.");
//       router.back(); return;
//     }
//     const pc = new RTCPeerConnection(ICE_SERVERS);
//     pcRef.current = pc;
//     stream.getTracks().forEach((track) => pc.addTrack(track, stream));
//     pc.ontrack = () => {};
//     pc.onicecandidate = ({ candidate }) => {
//       if (candidate) socket.emit("ice_candidate", { to: friend, candidate });
//     };
//     pc.onconnectionstatechange = () => {
//       if (pc.connectionState === "connected") {
//         setCallStatus("Connected"); setConnected(true);
//         timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
//       } else if (["disconnected","failed","closed"].includes(pc.connectionState)) {
//         teardown(true);
//       }
//     };
//     socket.on("call_answer", async ({ answer }) => {
//       await pc.setRemoteDescription(new RTCSessionDescription(answer));
//       remoteDescSetRef.current = true; await flushCandidates();
//     });
//     socket.on("ice_candidate", async ({ candidate }) => {
//       if (remoteDescSetRef.current) await pc.addIceCandidate(new RTCIceCandidate(candidate));
//       else pendingCandidatesRef.current.push(candidate);
//     });
//     socket.on("call_end", () => teardown(true));
//     if (calling) {
//       const offerSdp = await pc.createOffer({ offerToReceiveAudio: true });
//       await pc.setLocalDescription(offerSdp);
//       socket.emit("call_offer", { to: friend, offer: offerSdp, callerFname: fname });
//     } else {
//       const parsed = JSON.parse(offer);
//       await pc.setRemoteDescription(new RTCSessionDescription(parsed));
//       remoteDescSetRef.current = true; await flushCandidates();
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       socket.emit("call_answer", { to: friend, answer });
//     }
//   };
//   const flushCandidates = async () => {
//     for (const c of pendingCandidatesRef.current)
//       await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
//     pendingCandidatesRef.current = [];
//   };
//   const toggleMute = () => {
//     localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
//     setMuted((m) => !m);
//   };
//   const teardown = (emitEnd) => {
//     if (cleanedUpRef.current) return; cleanedUpRef.current = true;
//     if (emitEnd) socketRef.current?.emit("call_end", { to: friend });
//     clearInterval(timerRef.current);
//     localStreamRef.current?.getTracks().forEach((t) => t.stop());
//     pcRef.current?.close(); socketRef.current?.disconnect(); router.back();
//   };
//   const formatDuration = (secs) => {
//     const m = String(Math.floor(secs / 60)).padStart(2, "0");
//     const s = String(secs % 60).padStart(2, "0");
//     return `${m}:${s}`;
//   };
//   return ( ... ); // see styles below
// }
// ─────────────────────────────────────────────────────────────────────────────

export default function CallScreen() {
  const { friendFname, friend } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLetter}>
          {(friendFname || friend)?.[0]?.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{friendFname || friend}</Text>
      <Text style={styles.status}>Voice calls coming soon</Text>
      <Text style={styles.hint}>
        Requires a native build with react-native-webrtc
      </Text>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="white" />
        <Text style={styles.backText}>Go back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarLetter: { color: "white", fontSize: 42, fontWeight: "bold" },
  name: { color: "white", fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  status: { color: "#aaa", fontSize: 16, marginBottom: 8 },
  hint: { color: "#555", fontSize: 12, textAlign: "center", marginBottom: 48 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  backText: { color: "white", fontSize: 15 },
});
