import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Alert,
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

  useEffect(() => {
    if (!username) { router.replace("/login"); return; }

    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join", username);

    socket.on("call_offer", ({ from, callerFname, offer }) => {
      setIncomingCall({ from, callerFname, offer });
    });

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

  // Fetch on mount and every time the screen comes back into focus (e.g. returning from chat)
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
    <View style={styles.container}>
      <TouchableOpacity style={styles.hamburger} onPress={() => setMenuVisible(true)}>
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
                <Text style={styles.conversationName}>
                  {item.fname} {item.lname}
                </Text>
                <Text style={styles.latestMessage} numberOfLines={1}>
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

      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuContainer}>
            <Image
              source={require("../assets/pfp/profile_placeholder.png")}
              style={styles.profilePic}
            />
            <Text style={styles.fullName}>{fname} {lname}</Text>
            <Text style={styles.usernameText}>@{username}</Text>

            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => Alert.alert("Settings", "Settings clicked!")}
            >
              <Text style={styles.settingsText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => setMenuVisible(false)}>
              <Ionicons name="close-circle" size={36} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  hamburger: { position: "absolute", top: 40, left: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 60, marginBottom: 12, textAlign: "center" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8, borderColor: "#ccc" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#888", marginBottom: 6, marginTop: 4 },

  // Search results
  resultItem: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },
  resultName: { fontSize: 16, fontWeight: "500" },
  resultUsername: { fontSize: 13, color: "#888" },

  // Conversations
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

  emptyText: { textAlign: "center", color: "#aaa", marginTop: 40, paddingHorizontal: 20 },

  // Incoming call modal
  callModal: {
    width: "80%",
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  callAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  callAvatarText: { color: "white", fontSize: 34, fontWeight: "bold" },
  callName: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  callSubtitle: { color: "#aaa", fontSize: 14, marginBottom: 32 },
  callActions: { flexDirection: "row", gap: 40 },
  callActionGroup: { alignItems: "center", gap: 8 },
  acceptBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#34c759",
    justifyContent: "center",
    alignItems: "center",
  },
  declineBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e53935",
    justifyContent: "center",
    alignItems: "center",
  },
  declineIcon: { transform: [{ rotate: "135deg" }] },
  callActionLabel: { color: "#ccc", fontSize: 13 },

  // Profile modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  menuContainer: { width: "80%", backgroundColor: "white", borderRadius: 20, padding: 20, alignItems: "center" },
  profilePic: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  fullName: { fontSize: 22, fontWeight: "bold" },
  usernameText: { fontSize: 16, color: "gray", marginBottom: 20 },
  settingsButton: { marginVertical: 10, padding: 10, backgroundColor: "#eee", borderRadius: 8, width: "80%", alignItems: "center" },
  settingsText: { fontSize: 16 },
  logoutButton: { marginVertical: 10, padding: 10, backgroundColor: "#ffe6e6", borderRadius: 8, width: "80%", alignItems: "center" },
  logoutText: { fontSize: 16, color: "red" },
  closeButton: { marginTop: 10 },
});
