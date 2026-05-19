import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import * as ImagePicker from "expo-image-picker";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

export default function ChatScreen() {
  const { username, fname, friend, friendFname } = useLocalSearchParams();
  const router = useRouter();

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [friendTyping, setFriendTyping] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTapRef = useRef({});

  useEffect(() => {
    socketRef.current = io(BASE_URL);
    socketRef.current.emit("join", username);

    socketRef.current.on("receive_message", (msg) => {
      if (msg.sender === friend && msg.receiver === username) {
        setMessages((prev) => [...prev, msg]);
        markAsRead();
      }
    });

    socketRef.current.on("typing", () => setFriendTyping(true));
    socketRef.current.on("stop_typing", () => setFriendTyping(false));

    socketRef.current.on("status_update", ({ from, status }) => {
      if (from === friend) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === username && m.receiver === friend ? { ...m, status } : m
          )
        );
      }
    });

    socketRef.current.on("message_reaction", ({ messageId, loved }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, loved } : m))
      );
    });

    if (username && friend) fetchMessages();

    return () => socketRef.current?.disconnect();
  }, [username, friend]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/messages/${username}/${friend}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        markAsRead();
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`${BASE_URL}/api/messages/read/${friend}/${username}`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleTextChange = (val) => {
    setText(val);
    socketRef.current?.emit("typing", { to: friend });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { to: friend });
    }, 1500);
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("stop_typing", { to: friend });

    try {
      const res = await fetch(`${BASE_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: username, receiver: friend, content: text }),
      });
      const data = await res.json();
      if (data?._id) {
        setMessages((prev) => [...prev, data]);
        setText("");
      } else {
        console.error("Send message error:", data);
      }
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const pickAndSendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Allow photo access to send images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const formData = new FormData();

    if (Platform.OS === "web") {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      formData.append("image", blob, asset.fileName || "photo.jpg");
    } else {
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || "photo.jpg",
      });
    }

    formData.append("sender", username);
    formData.append("receiver", friend);

    try {
      const res = await fetch(`${BASE_URL}/api/messages/image`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data?._id) setMessages((prev) => [...prev, data]);
    } catch (err) {
      console.error("Image send error:", err);
    }
  };

  const handleDoubleTap = (item) => {
    const now = Date.now();
    const id = item._id;
    const last = lastTapRef.current[id] ?? 0;
    if (now - last < 300) {
      lastTapRef.current[id] = 0;
      toggleLove(item);
    } else {
      lastTapRef.current[id] = now;
    }
  };

  const toggleLove = async (item) => {
    const newLoved = !item.loved;
    setMessages((prev) =>
      prev.map((m) => (m._id === item._id ? { ...m, loved: newLoved } : m))
    );
    const target = item.sender === username ? item.receiver : item.sender;
    socketRef.current?.emit("message_reaction", { messageId: item._id, loved: newLoved, to: target });
    try {
      await fetch(`${BASE_URL}/api/messages/${item._id}/react`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loved: newLoved }),
      });
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const date = new Date(iso);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    const isThisYear = date.getFullYear() === now.getFullYear();
    const dateStr = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      ...(isThisYear ? {} : { year: "numeric" }),
    });
    return `${dateStr}, ${time}`;
  };

  const StatusIcon = ({ status }) => {
    if (status === "read")
      return <Ionicons name="checkmark-done" size={13} color="#4FC3F7" />;
    if (status === "delivered")
      return <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.6)" />;
    return <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.6)" />;
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender === username;
    return (
      <View
        style={[
          styles.bubbleWrapper,
          isMe ? styles.myWrapper : styles.theirWrapper,
          item.loved && styles.bubbleWrapperLoved,
        ]}
      >
        <Pressable onPress={() => handleDoubleTap(item)} style={styles.pressable}>
          <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
            {item.type === "image" ? (
              <Image source={{ uri: item.imageUrl }} style={styles.chatImage} resizeMode="cover" />
            ) : (
              <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                {item.content}
              </Text>
            )}
            <View style={[styles.metaRow, isMe ? styles.metaRight : styles.metaLeft]}>
              {isMe && <StatusIcon status={item.status} />}
              <Text selectable={false} style={[styles.timestamp, isMe && styles.timestampMine]}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
        </Pressable>

        {item.loved && (
          <View style={[styles.reactionBadge, isMe ? styles.reactionRight : styles.reactionLeft]}>
            <Text style={styles.reactionEmoji}>❤️</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: "/dashboard", params: { username, fname } })}
          style={styles.backBtn}
        >
          <Text style={{ color: "white", fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendFname || friend}</Text>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() =>
            router.push({
              pathname: "/call",
              params: { username, fname, friend, friendFname, isCaller: "true" },
            })
          }
        >
          <Ionicons name="call" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...messages].reverse()}
        renderItem={renderItem}
        keyExtractor={(item, index) => item._id?.toString() ?? index.toString()}
        contentContainerStyle={styles.chatContainer}
        inverted
      />

      {friendTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{friendFname || friend} is typing...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.imageBtn} onPress={pickAndSendImage}>
          <Text style={{ fontSize: 18 }}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor={theme.placeholder}
          value={text}
          onChangeText={handleTextChange}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={{ color: "white" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 15,
  },
  backBtn: { marginRight: 10, padding: 6 },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold", flex: 1 },
  callBtn: { padding: 4 },
  chatContainer: { padding: 10 },
  bubbleWrapper: { marginVertical: 3 },
  bubbleWrapperLoved: { marginBottom: 14 },
  myWrapper: { alignItems: "flex-end" },
  theirWrapper: { alignItems: "flex-start" },
  pressable: { maxWidth: "75%" },
  messageBubble: { padding: 10, borderRadius: 18 },
  myMessage: { backgroundColor: "#007AFF" },
  theirMessage: { backgroundColor: theme.theirBubble },
  myMessageText: { fontSize: 15, color: "white" },
  theirMessageText: { fontSize: 15, color: theme.theirBubbleText },
  messageText: { fontSize: 15, color: theme.theirBubbleText },
  chatImage: { width: 180, height: 180, borderRadius: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  metaRight: { justifyContent: "flex-end" },
  metaLeft: { justifyContent: "flex-start" },
  timestamp: { fontSize: 11, color: theme.subtext },
  timestampMine: { color: "rgba(255,255,255,0.6)" },
  reactionBadge: {
    position: "absolute",
    bottom: -12,
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionRight: { right: 6 },
  reactionLeft: { left: 6 },
  reactionEmoji: { fontSize: 12 },
  typingContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  typingText: { color: theme.subtext, fontSize: 13, fontStyle: "italic" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    backgroundColor: theme.inputBg,
    color: theme.text,
    marginHorizontal: 10,
  },
  sendBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  imageBtn: { padding: 5 },
});
