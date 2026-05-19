import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Animated,
  Switch,
} from "react-native";
import axios from "axios";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { BASE_URL } from "../config";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { useTheme } from "../context/ThemeContext";

export default function DashboardScreen() {
  const params = useLocalSearchParams() || {};
  const username = params.username || "";
  const fname = params.fname || "";
  const lname = params.lname || "";

  const { theme, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState("messages");
  const [spaces, setSpaces] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [createSpaceVisible, setCreateSpaceVisible] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [spaceUserSearch, setSpaceUserSearch] = useState("");
  const [spaceSearchResults, setSpaceSearchResults] = useState([]);
  const [spaceMembers, setSpaceMembers] = useState([]);
  const [creatingSpace, setCreatingSpace] = useState(false);

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
    socket.on("space_message", fetchSpaces);

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

  const fetchSpaces = useCallback(async () => {
    if (!username) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/spaces/user/${username}`);
      const spaceList = res.data.spaces || [];
      setSpaces(spaceList);
      spaceList.forEach((s) => {
        socketRef.current?.emit("join_space", s._id);
      });
    } catch (err) {
      console.log("Spaces fetch error:", err.message);
    }
  }, [username]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      fetchSpaces();
    }, [fetchConversations, fetchSpaces])
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

  const handleSpaceUserSearch = async () => {
    if (!spaceUserSearch.trim()) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/users/search?query=${spaceUserSearch}`);
      setSpaceSearchResults(res.data.users.filter(u => u.username !== username));
    } catch (err) {
      console.log("Space user search error:", err.message);
    }
  };

  const addSpaceMember = (user) => {
    if (!spaceMembers.find(m => m.username === user.username)) {
      setSpaceMembers(prev => [...prev, { username: user.username, fname: user.fname, lname: user.lname }]);
    }
  };

  const removeSpaceMember = (uname) => {
    setSpaceMembers(prev => prev.filter(m => m.username !== uname));
  };

  const resetCreateSpaceModal = () => {
    setNewSpaceName("");
    setSpaceUserSearch("");
    setSpaceSearchResults([]);
    setSpaceMembers([]);
    setCreatingSpace(false);
  };

  const handleCreateSpace = async () => {
    if (spaceMembers.length === 0 || creatingSpace) return;
    setCreatingSpace(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/spaces`, {
        owner: username,
        memberUsernames: spaceMembers.map(m => m.username),
        name: newSpaceName.trim() || undefined,
      });
      const { space } = res.data;
      setCreateSpaceVisible(false);
      resetCreateSpaceModal();
      fetchSpaces();
      router.push({
        pathname: "/space",
        params: { spaceId: space._id, spaceName: space.name, username, fname, lname },
      });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Failed to create space");
      setCreatingSpace(false);
    }
  };

  const showingSearch = searchQuery.trim().length > 0;

  const renderMessagesList = () => (
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
  );

  const renderSpacesList = () => (
    <FlatList
      data={spaces}
      keyExtractor={(item) => item._id}
      ListHeaderComponent={() =>
        spaces.length > 0 ? (
          <Text style={styles.sectionLabel}>Spaces</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() =>
            router.push({
              pathname: "/space",
              params: { spaceId: item._id, spaceName: item.name, username, fname, lname },
            })
          }
        >
          <View style={[styles.avatar, styles.spaceAvatar]}>
            <Text style={styles.avatarText}>
              {item.name?.[0]?.toUpperCase() || "#"}
            </Text>
          </View>
          <View style={styles.conversationInfo}>
            <Text style={styles.conversationName}>{item.name}</Text>
            <Text style={styles.latestMessage}>{item.members.length} members</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
        </TouchableOpacity>
      )}
      ListEmptyComponent={() => (
        <Text style={styles.emptyText}>No spaces yet. Tap + to create your first space.</Text>
      )}
    />
  );

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.hamburger} onPress={openMenu}>
          <Ionicons name="menu" size={32} color={theme.text} />
        </TouchableOpacity>

        {activeTab === "spaces" && !showingSearch && (
          <TouchableOpacity style={styles.newSpaceBtn} onPress={() => setCreateSpaceVisible(true)}>
            <Ionicons name="add" size={30} color={theme.text} />
          </TouchableOpacity>
        )}

        <Text style={styles.title}>Welcome {fname || username} 👋</Text>

        <TextInput
          style={styles.input}
          placeholder="Search for a user..."
          placeholderTextColor={theme.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />

        {!showingSearch && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "messages" && styles.tabActive]}
              onPress={() => setActiveTab("messages")}
            >
              <Text style={[styles.tabText, activeTab === "messages" && styles.tabTextActive]}>
                Messages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "spaces" && styles.tabActive]}
              onPress={() => setActiveTab("spaces")}
            >
              <Text style={[styles.tabText, activeTab === "spaces" && styles.tabTextActive]}>
                Spaces
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
        ) : activeTab === "messages" ? (
          renderMessagesList()
        ) : (
          renderSpacesList()
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

      {/* Create Space Modal */}
      <Modal
        visible={createSpaceVisible}
        animationType="slide"
        onRequestClose={() => { setCreateSpaceVisible(false); resetCreateSpaceModal(); }}
      >
        <View style={styles.createSpaceModal}>
          <View style={styles.createSpaceHeader}>
            <Text style={styles.createSpaceTitle}>New Space</Text>
            <TouchableOpacity
              onPress={() => { setCreateSpaceVisible(false); resetCreateSpaceModal(); }}
            >
              <Ionicons name="close" size={26} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Space Name <Text style={styles.optionalLabel}>(optional)</Text></Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. Work Group, Friday Squad..."
            placeholderTextColor={theme.placeholder}
            value={newSpaceName}
            onChangeText={setNewSpaceName}
          />

          <Text style={styles.fieldLabel}>Add Members</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
              placeholder="Search by username or email..."
              placeholderTextColor={theme.placeholder}
              value={spaceUserSearch}
              onChangeText={setSpaceUserSearch}
              onSubmitEditing={handleSpaceUserSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchIconBtn} onPress={handleSpaceUserSearch}>
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {spaceSearchResults.length > 0 && (
            <FlatList
              data={spaceSearchResults}
              keyExtractor={(item) => item._id}
              style={styles.searchResultsList}
              renderItem={({ item }) => {
                const isAdded = !!spaceMembers.find(m => m.username === item.username);
                return (
                  <TouchableOpacity
                    style={[styles.searchResultItem, isAdded && styles.searchResultItemAdded]}
                    onPress={() => isAdded ? removeSpaceMember(item.username) : addSpaceMember(item)}
                  >
                    <View>
                      <Text style={styles.resultName}>{item.fname} {item.lname}</Text>
                      <Text style={styles.resultUsername}>@{item.username}</Text>
                    </View>
                    <Ionicons
                      name={isAdded ? "checkmark-circle" : "add-circle-outline"}
                      size={22}
                      color={isAdded ? "#34c759" : "#007AFF"}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {spaceMembers.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Members ({spaceMembers.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {spaceMembers.map((m) => (
                  <View key={m.username} style={styles.chip}>
                    <Text style={styles.chipText}>{m.fname}</Text>
                    <TouchableOpacity onPress={() => removeSpaceMember(m.username)} style={styles.chipRemove}>
                      <Ionicons name="close-circle" size={16} color={theme.subtext} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.createSpaceBtn,
              (spaceMembers.length === 0 || creatingSpace) && styles.createSpaceBtnDisabled,
            ]}
            onPress={handleCreateSpace}
            disabled={spaceMembers.length === 0 || creatingSpace}
          >
            <Text style={styles.createSpaceBtnText}>
              {creatingSpace ? "Creating..." : "Create Space"}
            </Text>
          </TouchableOpacity>
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

        {/* Dark mode toggle */}
        <View style={styles.sidebarItem}>
          <Ionicons name="moon-outline" size={20} color="#d0dce8" />
          <Text style={[styles.sidebarItemText, { flex: 1 }]}>Dark Mode</Text>
          <Switch
            value={theme.dark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#3e4a5a", true: "#007AFF" }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.sidebarLogout} onPress={handleLogout}>
          <Text style={styles.sidebarLogoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  root: { flex: 1, overflow: "hidden", backgroundColor: theme.bg },
  container: { flex: 1, padding: 20 },
  hamburger: { position: "absolute", top: 40, left: 20, zIndex: 10 },
  newSpaceBtn: { position: "absolute", top: 40, right: 20, zIndex: 10 },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 60, marginBottom: 12, textAlign: "center", color: theme.text },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderColor: theme.inputBorder,
    backgroundColor: theme.inputBg,
    color: theme.text,
  },

  tabBar: { flexDirection: "row", marginBottom: 8, borderBottomWidth: 1, borderColor: theme.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#007AFF" },
  tabText: { fontSize: 15, fontWeight: "500", color: theme.tabInactive },
  tabTextActive: { color: "#007AFF", fontWeight: "700" },

  sectionLabel: { fontSize: 13, fontWeight: "600", color: theme.sectionLabel, marginBottom: 6, marginTop: 4 },

  resultItem: { padding: 12, borderBottomWidth: 1, borderColor: theme.border },
  resultName: { fontSize: 16, fontWeight: "500", color: theme.text },
  resultUsername: { fontSize: 13, color: theme.subtext },

  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.border,
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
  spaceAvatar: { backgroundColor: "#5856d6" },
  avatarText: { color: "white", fontSize: 18, fontWeight: "bold" },
  conversationInfo: { flex: 1 },
  conversationName: { fontSize: 16, fontWeight: "600", color: theme.text },
  latestMessage: { fontSize: 13, color: theme.subtext, marginTop: 2 },
  unreadBold: { fontWeight: "bold", color: theme.unreadText },
  emptyText: { textAlign: "center", color: theme.subtext, marginTop: 40, paddingHorizontal: 20 },

  // Incoming call modal (always dark)
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

  // Create Space modal
  createSpaceModal: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: theme.surface },
  createSpaceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  createSpaceTitle: { fontSize: 22, fontWeight: "bold", color: theme.text },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: theme.subtext, marginBottom: 6 },
  optionalLabel: { fontSize: 12, fontWeight: "400", color: theme.placeholder },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: theme.inputBg,
    color: theme.text,
  },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  searchIconBtn: { width: 46, height: 46, borderRadius: 10, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center" },
  searchResultsList: { maxHeight: 180, marginBottom: 4 },
  searchResultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  searchResultItemAdded: { backgroundColor: theme.addedItemBg },
  chipsScroll: { marginBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.chipBg,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    marginRight: 8,
    gap: 4,
  },
  chipText: { fontSize: 14, color: theme.chipText, fontWeight: "500" },
  chipRemove: { marginLeft: 2 },
  createSpaceBtn: { backgroundColor: "#007AFF", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: "auto", marginBottom: 16 },
  createSpaceBtnDisabled: { backgroundColor: "#a0c4ff" },
  createSpaceBtnText: { color: "white", fontSize: 17, fontWeight: "700" },

  // Sidebar (always dark themed)
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
