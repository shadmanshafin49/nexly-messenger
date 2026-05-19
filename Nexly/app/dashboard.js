import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Alert,
  Animated,
} from "react-native";
import axios from "axios";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { BASE_URL } from "../config";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";

export default function DashboardScreen() {
  const params = useLocalSearchParams() || {};
  const username = params.username || "";
  const fname = params.fname || "";
  const lname = params.lname || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(
      () => setMenuVisible(false)
    );
  };

  useEffect(() => {
    if (!username) { router.replace("/login"); return; }

    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join", username);

    socket.on("call_offer", ({ from, callerFname, offer }) => {
      setIncomingCall({ from, callerFname, offer });
    });

    socket.on("receive_message", fetchConversations);

    return () => socket.disconnect();
  }, [username]);

  const fetchConversations = useCallback(async () => {
    if (!username) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/messages/conversations/${username}`);
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.log("Conversations fetch error:", err.message);
    }
  }, [username]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/users/search?query=${searchQuery}`);
      const filtered = res.data.users.filter(u => u.username !== username);
      setResults(filtered);
    } catch (err) {
      console.log("Search error:", err.response?.data || err.message);
    }
  };

  const openChat = (friendUsername, friendFname) => {
    if (!friendUsername) return;
    router.push({
      pathname: "/chat",
      params: { username, fname, lname, friend: friendUsername, friendFname },
    });
  };

  const handleLogout = () => {
    closeMenu();
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => router.replace("/login"), style: "destructive" },
    ]);
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    const { from, callerFname, offer } = incomingCall;
    setIncomingCall(null);
    router.push({
      pathname: "/call",
      params: {
        username,
        fname,
        friend: from,
        friendFname: callerFname || from,
        isCaller: "false",
        offer: JSON.stringify(offer),
      },
    });
  };

  const declineCall = () => {
    if (!incomingCall) return;
    socketRef.current?.emit("call_end", { to: incomingCall.from });
    setIncomingCall(null);
  };

  const showingSearch = searchQuery.trim().length > 0;

  return (
    <View style={styles.root}>
      {/* Main content */}
      <View style={styles.container}>
        <TouchableOpacity style={styles.hamburger} onPress={openMenu}>
          <Ionicons name="menu" size={32} color="black" />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome {fname || username} 👋</Text>

        <TextInput
          style={styles.input}
          placeholder="Search for a user..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />

        {showingSearch ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => openChat(item.username, item.fname)}
              >
                <Text style={styles.resultName}>{item.fname} {item.lname}</Text>
                <Text style={styles.resultUsername}>@{item.username}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No users found</Text>
            )}
          />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.partnerUsername}
            ListHeaderComponent={() =>
              conversations.length > 0 ? (
                <Text style={styles.sectionLabel}>Messages</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => openChat(item.partnerUsername, item.fname)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.fname?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={styles.conversationInfo}>
                  <Text style={[styles.conversationName, item.unread && styles.unreadBold]}>
                    {item.fname} {item.lname}
                  </Text>
                  <Text style={[styles.latestMessage, item.unread && styles.unreadBold]} numberOfLines={1}>
                    {item.isMine ? "You: " : ""}{item.latestMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No conversations yet. Search for a user to start chatting.</Text>
            )}
          />
        )}
      </View>

      {/* Incoming call modal */}
      <Modal
        visible={!!incomingCall}
        animationType="slide"
        transparent={true}
        onRequestClose={declineCall}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.callModal}>
            <View style={styles.callAvatar}>
              <Text style={styles.callAvatarText}>
                {(incomingCall?.callerFname || incomingCall?.from)?.[0]?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.callName}>
              {incomingCall?.callerFname || incomingCall?.from}
            </Text>
            <Text style={styles.callSubtitle}>Incoming voice call</Text>

            <View style={styles.callActions}>
              <View style={styles.callActionGroup}>
                <TouchableOpacity style={styles.declineBtn} onPress={declineCall}>
                  <Ionicons name="call" size={28} color="white" style={styles.declineIcon} />
                </TouchableOpacity>
                <Text style={styles.callActionLabel}>Decline</Text>
              </View>
              <View style={styles.callActionGroup}>
                <TouchableOpacity style={styles.acceptBtn} onPress={acceptCall}>
                  <Ionicons name="call" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.callActionLabel}>Accept</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sidebar overlay */}
      {menuVisible && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Sidebar */}
      <Animated.View
        pointerEvents={menuVisible ? "box-none" : "none"}
        style={[styles.sidebar, { left: slideAnim.interpolate({ inputRange: [0, 1], outputRange: ["-60%", "0%"] }) }]}
      >
          <View style={styles.sidebarProfile}>
            <Text style={styles.sidebarName}>{fname} {lname}</Text>
            <Text style={styles.sidebarUsername}>@{username}</Text>
          </View>

          <View style={styles.sidebarDivider} />

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => { closeMenu(); router.push("/settings"); }}
          >
            <Ionicons name="settings-outline" size={20} color="#d0dce8" />
            <Text style={styles.sidebarItemText}>Settings</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.sidebarLogout} onPress={handleLogout}>
            <Text style={styles.sidebarLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  container: { flex: 1, padding: 20 },
  hamburger: { position: "absolute", top: 40, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 60, marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8, borderColor: "#ccc" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#888", marginBottom: 6, marginTop: 4 },

  resultItem: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },
  resultName: { fontSize: 16, fontWeight: "500" },
  resultUsername: { fontSize: 13, color: "#888" },

  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "white", fontSize: 18, fontWeight: "bold" },
  conversationInfo: { flex: 1 },
  conversationName: { fontSize: 16, fontWeight: "600" },
  latestMessage: { fontSize: 13, color: "#888", marginTop: 2 },
  unreadBold: { fontWeight: "bold", color: "#000" },
  emptyText: { textAlign: "center", color: "#aaa", marginTop: 40, paddingHorizontal: 20 },

  // Incoming call modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  callModal: { width: "80%", backgroundColor: "#1a1a2e", borderRadius: 24, padding: 28, alignItems: "center" },
  callAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  callAvatarText: { color: "white", fontSize: 34, fontWeight: "bold" },
  callName: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  callSubtitle: { color: "#aaa", fontSize: 14, marginBottom: 32 },
  callActions: { flexDirection: "row", gap: 40 },
  callActionGroup: { alignItems: "center", gap: 8 },
  acceptBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#34c759", justifyContent: "center", alignItems: "center" },
  declineBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#e53935", justifyContent: "center", alignItems: "center" },
  declineIcon: { transform: [{ rotate: "135deg" }] },
  callActionLabel: { color: "#ccc", fontSize: 13 },

  // Sidebar
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 100 },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "60%",
    backgroundColor: "#1c2a3a",
    zIndex: 200,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  sidebarProfile: { marginBottom: 20 },
  sidebarName: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  sidebarUsername: { fontSize: 14, color: "#8eacc8", marginTop: 4 },
  sidebarDivider: { height: 1, backgroundColor: "#2e4057", marginBottom: 12 },
  sidebarItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  sidebarItemText: { fontSize: 16, color: "#d0dce8" },
  sidebarLogout: { paddingVertical: 14 },
  sidebarLogoutText: { fontSize: 16, color: "#ff6b6b", fontWeight: "600" },
});
