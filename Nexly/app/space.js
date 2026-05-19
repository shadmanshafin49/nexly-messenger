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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace({ pathname: "/dashboard", params: { username, fname, lname } })
          }
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}>
            <Text style={{ fontSize: 16 }}>🌐</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        </View>
      </View>

      {/* Members row */}
      {members.length > 0 && (
        <View style={styles.membersSection}>
          <Text style={styles.membersLabel}>Members</Text>
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

      <Text style={styles.sectionLabel}>Channels</Text>

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => openChat(item)} activeOpacity={0.8}>
            <View style={styles.chatIcon}>
              <Text style={{ fontSize: 18 }}>#</Text>
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No channels yet.</Text>
            <Text style={styles.emptyHint}>Tap + to create one!</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setNewChatVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#1A1A1A" />
      </TouchableOpacity>

      <Modal visible={newChatVisible} transparent animationType="fade" onRequestClose={() => setNewChatVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Channel</Text>
            <Text style={styles.modalLabel}>Channel Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Weekend Plans"
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
                activeOpacity={0.85}
              >
                <Text style={styles.createBtnText}>{creatingChat ? "Creating..." : "Create →"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (theme) => {
  const cardShadow = {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: theme.dark ? 0.8 : 1,
    shadowRadius: 0,
    elevation: 5,
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
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: theme.dark ? 0.8 : 1,
      shadowRadius: 0,
      elevation: 4,
    },
    backArrow: { fontSize: 18, color: theme.text, fontWeight: "700" },
    headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: theme.text, flex: 1 },

    membersSection: {
      backgroundColor: theme.surface,
      borderBottomWidth: 2,
      borderBottomColor: theme.cardBorder,
      paddingVertical: 14,
    },
    membersLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.subtext,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
      paddingHorizontal: 16,
    },
    membersScroll: { paddingHorizontal: 16, gap: 14 },
    memberItem: { alignItems: "center", width: 52 },
    memberAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 5,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: theme.dark ? 0.8 : 1,
      shadowRadius: 0,
      elevation: 3,
    },
    memberAvatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
    memberName: { fontSize: 11, color: theme.subtext, width: 52, textAlign: "center" },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.sectionLabel,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 18,
      marginBottom: 8,
      marginHorizontal: 16,
    },

    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    chatItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      marginBottom: 10,
      ...cardShadow,
    },
    chatIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.chipBg,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    chatInfo: { flex: 1 },
    chatName: { fontSize: 16, fontWeight: "700", color: theme.text },
    chatLatest: { fontSize: 13, color: theme.subtext, marginTop: 2 },
    chatEmpty: { fontSize: 13, color: theme.placeholder, marginTop: 2, fontStyle: "italic" },

    emptyContainer: { alignItems: "center", marginTop: 60 },
    emptyEmoji: { fontSize: 40, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 4 },
    emptyHint: { fontSize: 14, color: theme.subtext },

    fab: {
      position: "absolute",
      bottom: 28,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.accent,
      justifyContent: "center",
      alignItems: "center",
      ...cardShadow,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalBox: {
      width: "84%",
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      padding: 24,
      ...cardShadow,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: theme.text,
      marginBottom: 18,
    },
    modalLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.subtext,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 7,
    },
    modalInput: {
      borderWidth: 2,
      borderColor: theme.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      marginBottom: 22,
      backgroundColor: theme.inputBg,
      color: theme.text,
    },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
    cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      backgroundColor: theme.bg,
    },
    cancelText: { fontSize: 15, fontWeight: "700", color: theme.subtext },
    createBtn: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: theme.dark ? 0.8 : 1,
      shadowRadius: 0,
      elevation: 4,
    },
    createBtnDisabled: { opacity: 0.5 },
    createBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  });
};
