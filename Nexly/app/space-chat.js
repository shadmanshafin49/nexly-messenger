import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

export default function SpaceChatScreen() {
  const { spaceId, chatId, chatName, spaceName, username, fname, lname } = useLocalSearchParams();
  const router = useRouter();

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [memberNameMap, setMemberNameMap] = useState({});
  const socketRef = useRef(null);
  const lastTapRef = useRef({});

  useEffect(() => {
    if (!spaceId || !chatId) return;

    fetch(`${BASE_URL}/api/spaces/${spaceId}`)
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        (data.members || []).forEach((m) => { map[m.username] = m.fname; });
        setMemberNameMap(map);
      })
      .catch((err) => console.error("Error fetching space members:", err));

    fetch(`${BASE_URL}/api/spaces/${spaceId}/chats/${chatId}/messages`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setMessages(data); })
      .catch((err) => console.error("Error fetching messages:", err));

    socketRef.current = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current.emit("join", username);
    socketRef.current.emit("join_space", spaceId);

    socketRef.current.on("space_message", ({ chatId: incomingChatId, message }) => {
      if (incomingChatId !== chatId) return;
      if (message.sender === username) return;
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on("space_message_reaction", ({ messageId, loved }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, loved } : m))
      );
    });

    return () => socketRef.current?.disconnect();
  }, [spaceId, chatId, username]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg = { _id: tempId, sender: username, content, createdAt: new Date().toISOString(), loved: false };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`${BASE_URL}/api/spaces/${spaceId}/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: username, content }),
      });
      const data = await res.json();
      if (data?._id) {
        setMessages((prev) => prev.map((m) => (m._id === tempId ? data : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
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
    setMessages((prev) => prev.map((m) => (m._id === item._id ? { ...m, loved: newLoved } : m)));
    try {
      await fetch(`${BASE_URL}/api/spaces/messages/${item._id}/react`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loved: newLoved, spaceId }),
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
    const dateStr = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    });
    return `${dateStr}, ${time}`;
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender === username;
    const senderName = !isMe ? (memberNameMap[item.sender] || item.sender) : null;

    return (
      <View
        style={[
          styles.bubbleWrapper,
          isMe ? styles.myWrapper : styles.theirWrapper,
          item.loved && styles.bubbleWrapperLoved,
        ]}
      >
        {!isMe && <Text style={styles.senderName}>{senderName}</Text>}
        <Pressable onPress={() => handleDoubleTap(item)} style={styles.pressable}>
          <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
            <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
              {item.content}
            </Text>
            <Text selectable={false} style={[styles.timestamp, isMe && styles.timestampMine]}>
              {formatTime(item.createdAt)}
            </Text>
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
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace({ pathname: "/space", params: { spaceId, username, fname, lname } })
          }
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{spaceName}</Text>
        </View>
      </View>

      <FlatList
        data={[...messages].reverse()}
        renderItem={renderItem}
        keyExtractor={(item, index) => item._id?.toString() ?? index.toString()}
        contentContainerStyle={styles.chatContainer}
        inverted
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={theme.placeholder}
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Ionicons name="send" size={18} color="white" />
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
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 10, padding: 4 },
  backArrow: { color: "white", fontSize: 22 },
  headerText: { flex: 1 },
  headerTitle: { color: "white", fontSize: 17, fontWeight: "bold" },
  headerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 },

  chatContainer: { padding: 10 },
  bubbleWrapper: { marginVertical: 3 },
  bubbleWrapperLoved: { marginBottom: 14 },
  myWrapper: { alignItems: "flex-end" },
  theirWrapper: { alignItems: "flex-start" },
  pressable: { maxWidth: "75%" },

  senderName: { fontSize: 12, fontWeight: "600", color: "#007AFF", marginBottom: 2, marginLeft: 4 },

  messageBubble: { padding: 10, borderRadius: 18 },
  myMessage: { backgroundColor: "#007AFF" },
  theirMessage: { backgroundColor: theme.theirBubble },
  myMessageText: { fontSize: 15, color: "white" },
  theirMessageText: { fontSize: 15, color: theme.theirBubbleText },
  messageText: { fontSize: 15 },

  timestamp: { fontSize: 11, color: theme.subtext, marginTop: 3, textAlign: "right" },
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
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
