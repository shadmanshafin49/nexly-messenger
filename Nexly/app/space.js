import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

export default function SpaceScreen() {
  const { spaceId, spaceName: initialName, username, fname, lname } = useLocalSearchParams();
  const router = useRouter();

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [space, setSpace] = useState(null);
  const [members, setMembers] = useState([]);
  const [chats, setChats] = useState([]);
  const [newChatVisible, setNewChatVisible] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!spaceId) return;

    socketRef.current = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current.emit("join", username);
    socketRef.current.emit("join_space", spaceId);

    socketRef.current.on("new_space_chat", (chat) => {
      setChats((prev) => [...prev, { ...chat, latestMessage: null, latestSender: null }]);
    });

    socketRef.current.on("space_message", ({ chatId, message }) => {
      setChats((prev) =>
        prev.map((c) =>
          c._id === chatId
            ? { ...c, latestMessage: message.content, latestSender: message.sender }
            : c
        )
      );
    });

    socketRef.current.on("space_updated", ({ name }) => {
      setSpace((prev) => prev ? { ...prev, name } : prev);
    });

    return () => socketRef.current?.disconnect();
  }, [spaceId, username]);

  const fetchSpaceDetails = useCallback(async () => {
    if (!spaceId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/spaces/${spaceId}`);
      const data = await res.json();
      setSpace(data.space);
      setMembers(data.members || []);
    } catch (err) {
      console.error("Error fetching space:", err);
    }
  }, [spaceId]);

  const fetchChats = useCallback(async () => {
    if (!spaceId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/spaces/${spaceId}/chats`);
      const data = await res.json();
      setChats(data.chats || []);
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  }, [spaceId]);

  useFocusEffect(
    useCallback(() => {
      fetchSpaceDetails();
      fetchChats();
    }, [fetchSpaceDetails, fetchChats])
  );

  const handleCreateChat = async () => {
    if (!newChatName.trim() || creatingChat) return;
    setCreatingChat(true);
    try {
      const res = await fetch(`${BASE_URL}/api/spaces/${spaceId}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChatName.trim(), createdBy: username }),
      });
      const data = await res.json();
      if (data.chat) {
        setNewChatVisible(false);
        setNewChatName("");
        router.push({
          pathname: "/space-chat",
          params: {
            spaceId,
            chatId: data.chat._id,
            chatName: data.chat.name,
            spaceName: space?.name || initialName,
            username,
            fname,
            lname,
          },
        });
      }
    } catch (err) {
      Alert.alert("Error", "Could not create chat");
    } finally {
      setCreatingChat(false);
    }
  };

  const openChat = (chat) => {
    router.push({
      pathname: "/space-chat",
      params: {
        spaceId,
        chatId: chat._id,
        chatName: chat.name,
        spaceName: space?.name || initialName,
        username,
        fname,
        lname,
      },
    });
  };

  const displayName = space?.name || initialName || "Space";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: "/dashboard", params: { username, fname, lname } })}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
      </View>

      {members.length > 0 && (
        <View style={styles.membersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
            {members.map((m) => (
              <View key={m.username} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{m.fname?.[0]?.toUpperCase() || "?"}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{m.fname}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionLabel}>Chats</Text>

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => openChat(item)}>
            <View style={styles.chatIcon}>
              <Ionicons name="chatbubbles-outline" size={22} color="#007AFF" />
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{item.name}</Text>
              {item.latestMessage ? (
                <Text style={styles.chatLatest} numberOfLines={1}>
                  {item.latestSender ? `${item.latestSender}: ` : ""}{item.latestMessage}
                </Text>
              ) : (
                <Text style={styles.chatEmpty}>No messages yet</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No chats yet. Tap + to create one.</Text>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setNewChatVisible(true)}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal visible={newChatVisible} transparent animationType="fade" onRequestClose={() => setNewChatVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Chat</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Chat name (e.g. Weekend Plans)"
              placeholderTextColor={theme.placeholder}
              value={newChatName}
              onChangeText={setNewChatName}
              autoFocus
              onSubmitEditing={handleCreateChat}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setNewChatVisible(false); setNewChatName(""); }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, (!newChatName.trim() || creatingChat) && styles.createBtnDisabled]}
                onPress={handleCreateChat}
                disabled={!newChatName.trim() || creatingChat}
              >
                <Text style={styles.createBtnText}>{creatingChat ? "Creating..." : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold", flex: 1 },

  membersSection: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 12,
  },
  membersScroll: { paddingHorizontal: 16, gap: 16 },
  memberItem: { alignItems: "center", width: 56 },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  memberAvatarText: { color: "white", fontSize: 18, fontWeight: "bold" },
  memberName: { fontSize: 11, color: theme.subtext, width: 56, textAlign: "center" },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.sectionLabel,
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 16,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 90 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.dark ? 0 : 0.05,
    shadowRadius: 4,
    elevation: theme.dark ? 0 : 2,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.dark ? "#1a2a4a" : "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: "600", color: theme.text },
  chatLatest: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  chatEmpty: { fontSize: 13, color: theme.placeholder, marginTop: 2, fontStyle: "italic" },

  emptyText: { textAlign: "center", color: theme.subtext, marginTop: 40, fontSize: 14 },

  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "82%", backgroundColor: theme.surface, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, color: theme.text },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 20,
    backgroundColor: theme.inputBg,
    color: theme.text,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 15, color: theme.subtext },
  createBtn: { backgroundColor: "#007AFF", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  createBtnDisabled: { backgroundColor: "#a0c4ff" },
  createBtnText: { color: "white", fontWeight: "600", fontSize: 15 },
});
