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
      return <Ionicons name="checkmark-done" size={13} color="#FAF7F0" />;
    if (status === "delivered")
      return <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.55)" />;
    return <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.55)" />;
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
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace({ pathname: "/dashboard", params: { username, fname } })
          }
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {(friendFname || friend)?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {friendFname || friend}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.callBtn}
          onPress={() =>
            router.push({
              pathname: "/call",
              params: { username, fname, friend, friendFname, isCaller: "true" },
            })
          }
        >
          <Ionicons name="call" size={18} color={theme.text} />
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
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>{friendFname || friend} is typing...</Text>
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.imageBtn} onPress={pickAndSendImage}>
          <Text style={{ fontSize: 20 }}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={theme.placeholder}
          value={text}
          onChangeText={handleTextChange}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Ionicons name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme) => {
  const cardShadow = {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: theme.dark ? 0.8 : 1,
    shadowRadius: 0,
    elevation: 4,
  };

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      paddingTop: 50,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 2,
      borderBottomColor: theme.cardBorder,
      gap: 10,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.bg,
      justifyContent: "center",
      alignItems: "center",
      ...cardShadow,
    },
    backArrow: { fontSize: 18, color: theme.text, fontWeight: "700" },

    headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      justifyContent: "center",
      alignItems: "center",
    },
    headerAvatarText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
    headerTitle: { fontSize: 17, fontWeight: "800", color: theme.text, flex: 1 },

    callBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.accent,
      justifyContent: "center",
      alignItems: "center",
      ...cardShadow,
    },

    chatContainer: { paddingHorizontal: 14, paddingVertical: 10 },

    bubbleWrapper: { marginVertical: 4 },
    bubbleWrapperLoved: { marginBottom: 18 },
    myWrapper: { alignItems: "flex-end" },
    theirWrapper: { alignItems: "flex-start" },
    pressable: { maxWidth: "78%" },

    messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    myMessage: {
      backgroundColor: theme.primary,
      borderBottomRightRadius: 4,
    },
    theirMessage: {
      backgroundColor: theme.theirBubble,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderBottomLeftRadius: 4,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: theme.dark ? 0.8 : 1,
      shadowRadius: 0,
      elevation: 3,
    },

    myMessageText: { fontSize: 15, color: "#FFFFFF", lineHeight: 21 },
    theirMessageText: { fontSize: 15, color: theme.theirBubbleText, lineHeight: 21 },
    messageText: { fontSize: 15, lineHeight: 21 },

    chatImage: { width: 190, height: 190, borderRadius: 12 },

    metaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
    metaRight: { justifyContent: "flex-end" },
    metaLeft: { justifyContent: "flex-start" },
    timestamp: { fontSize: 11, color: theme.subtext },
    timestampMine: { color: "rgba(255,255,255,0.55)" },

    reactionBadge: {
      position: "absolute",
      bottom: -14,
      backgroundColor: theme.surface,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: theme.dark ? 0.8 : 1,
      shadowRadius: 0,
      elevation: 2,
    },
    reactionRight: { right: 6 },
    reactionLeft: { left: 6 },
    reactionEmoji: { fontSize: 13 },

    typingContainer: { paddingHorizontal: 16, paddingBottom: 6 },
    typingBubble: {
      alignSelf: "flex-start",
      backgroundColor: theme.theirBubble,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 14,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: theme.dark ? 0.8 : 1,
      shadowRadius: 0,
      elevation: 2,
    },
    typingText: { color: theme.subtext, fontSize: 13, fontStyle: "italic" },

    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 2,
      borderTopColor: theme.cardBorder,
      backgroundColor: theme.surface,
      gap: 8,
    },
    imageBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    input: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.inputBorder,
      backgroundColor: theme.inputBg,
      color: theme.text,
      fontSize: 15,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: theme.dark ? 0.8 : 1,
      shadowRadius: 0,
      elevation: 4,
    },
  });
};
