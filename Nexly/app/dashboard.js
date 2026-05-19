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

const formatConvTime = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (now - date < 7 * oneDay)
    return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

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

  const fetchConversationsRef = useRef(null);

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
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]);

  useEffect(() => {
    if (!username) { router.replace("/login"); return; }
    const socket = io(BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join", username);
    socket.on("call_offer", ({ from, callerFname, offer }) => setIncomingCall({ from, callerFname, offer }));
    socket.on("receive_message", (msg) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.partnerUsername === msg.sender);
        if (idx !== -1) {
          const updated = [...prev];
          const item = {
            ...updated[idx],
            latestMessage: msg.type === "image" ? "📷 Image" : msg.content,
            latestMessageAt: msg.createdAt,
            unread: true,
            unreadCount: (updated[idx].unreadCount || 0) + 1,
            isMine: false,
          };
          updated.splice(idx, 1);
          return [item, ...updated];
        }
        fetchConversationsRef.current?.();
        return prev;
      });
    });
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
      spaceList.forEach((s) => socketRef.current?.emit("join_space", s._id));
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
      setResults(res.data.users.filter(u => u.username !== username));
    } catch (err) {
      console.log("Search error:", err.response?.data || err.message);
    }
  };

  const openChat = (friendUsername, friendFname) => {
    if (!friendUsername) return;
    setConversations((prev) =>
      prev.map((c) => c.partnerUsername === friendUsername ? { ...c, unreadCount: 0, unread: false } : c)
    );
    router.push({ pathname: "/chat", params: { username, fname, lname, friend: friendUsername, friendFname } });
  };

  const handleLogout = () => {
    closeMenu();
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", onPress: () => router.replace("/login"), style: "destructive" },
    ]);
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    const { from, callerFname, offer } = incomingCall;
    setIncomingCall(null);
    router.push({
      pathname: "/call",
      params: { username, fname, friend: from, friendFname: callerFname || from, isCaller: "false", offer: JSON.stringify(offer) },
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
    if (!spaceMembers.find(m => m.username === user.username))
      setSpaceMembers(prev => [...prev, user]);
  };

  const removeSpaceMember = (uname) => setSpaceMembers(prev => prev.filter(m => m.username !== uname));

  const resetCreateSpaceModal = () => {
    setNewSpaceName(""); setSpaceUserSearch(""); setSpaceSearchResults([]); setSpaceMembers([]); setCreatingSpace(false);
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
      router.push({ pathname: "/space", params: { spaceId: space._id, spaceName: space.name, username, fname, lname } });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Failed to create space");
      setCreatingSpace(false);
    }
  };

  const showingSearch = searchQuery.trim().length > 0;

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity style={styles.convCard} onPress={() => openChat(item.partnerUsername, item.fname)} activeOpacity={0.85}>
      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
        <Text style={styles.avatarText}>{item.fname?.[0]?.toUpperCase() || "?"}</Text>
      </View>
      <View style={styles.convContent}>
        <View style={styles.convRow}>
          <Text style={styles.convName} numberOfLines={1}>
            {item.fname} {item.lname}
          </Text>
          <Text style={styles.convTime}>{formatConvTime(item.latestMessageAt)}</Text>
        </View>
        <Text style={styles.convPreview} numberOfLines={1}>
          {item.isMine ? "You: " : ""}{item.latestMessage}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSpaceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.convCard}
      onPress={() => router.push({ pathname: "/space", params: { spaceId: item._id, spaceName: item.name, username, fname, lname } })}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: "#5856D6" }]}>
        <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || "#"}</Text>
      </View>
      <View style={styles.convContent}>
        <Text style={styles.convName}>{item.name}</Text>
        <Text style={styles.convPreview}>{item.members.length} members</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
    </TouchableOpacity>
  );

  const renderSearchItem = ({ item }) => (
    <TouchableOpacity style={styles.searchResultCard} onPress={() => openChat(item.username, item.fname)} activeOpacity={0.85}>
      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
        <Text style={styles.avatarText}>{item.fname?.[0]?.toUpperCase() || "?"}</Text>
      </View>
      <View>
        <Text style={styles.convName}>{item.fname} {item.lname}</Text>
        <Text style={styles.convPreview}>@{item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuBtn} onPress={openMenu}>
            <Ionicons name="menu" size={26} color={theme.text} />
          </TouchableOpacity>
          {activeTab === "spaces" && !showingSearch && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreateSpaceVisible(true)}>
              <Ionicons name="add" size={24} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Greeting */}
        {!showingSearch && (
          <View style={styles.greeting}>
            <Text style={styles.greetSub}>Hey there,</Text>
            <Text style={styles.greetName}>{fname || username}! 👋</Text>
          </View>
        )}

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a user..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        {!showingSearch && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "messages" && styles.tabActive]}
              onPress={() => setActiveTab("messages")}
            >
              <Text style={[styles.tabText, activeTab === "messages" && styles.tabTextActive]}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "spaces" && styles.tabActive]}
              onPress={() => setActiveTab("spaces")}
            >
              <Text style={[styles.tabText, activeTab === "spaces" && styles.tabTextActive]}>Spaces</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {showingSearch ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item._id}
            renderItem={renderSearchItem}
            ListEmptyComponent={() => <Text style={styles.emptyText}>No users found</Text>}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : activeTab === "messages" ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.partnerUsername}
            renderItem={renderConversationItem}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>Search for a user above to start chatting.</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <FlatList
            data={spaces}
            keyExtractor={(item) => item._id}
            renderItem={renderSpaceItem}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>#</Text>
                <Text style={styles.emptyTitle}>No spaces yet</Text>
                <Text style={styles.emptyText}>Tap + to create your first space.</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Incoming call modal */}
      <Modal visible={!!incomingCall} animationType="slide" transparent onRequestClose={declineCall}>
        <View style={styles.modalOverlay}>
          <View style={styles.callModal}>
            <View style={styles.callAvatar}>
              <Text style={styles.callAvatarText}>
                {(incomingCall?.callerFname || incomingCall?.from)?.[0]?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.callName}>{incomingCall?.callerFname || incomingCall?.from}</Text>
            <Text style={styles.callSubtitle}>Incoming voice call</Text>
            <View style={styles.callActions}>
              <View style={styles.callActionGroup}>
                <TouchableOpacity style={styles.declineBtn} onPress={declineCall}>
                  <Ionicons name="call" size={28} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
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

      {/* Create Space modal */}
      <Modal visible={createSpaceVisible} animationType="slide" onRequestClose={() => { setCreateSpaceVisible(false); resetCreateSpaceModal(); }}>
        <View style={styles.createSpaceModal}>
          <View style={styles.createSpaceHeader}>
            <Text style={styles.createSpaceTitle}>New Space</Text>
            <TouchableOpacity onPress={() => { setCreateSpaceVisible(false); resetCreateSpaceModal(); }}>
              <Ionicons name="close" size={26} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Space Name <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. Work Group, Squad..."
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
              style={styles.spaceSearchList}
              renderItem={({ item }) => {
                const isAdded = !!spaceMembers.find(m => m.username === item.username);
                return (
                  <TouchableOpacity
                    style={[styles.spaceSearchItem, isAdded && styles.spaceSearchItemAdded]}
                    onPress={() => isAdded ? removeSpaceMember(item.username) : addSpaceMember(item)}
                  >
                    <View>
                      <Text style={styles.convName}>{item.fname} {item.lname}</Text>
                      <Text style={styles.convPreview}>@{item.username}</Text>
                    </View>
                    <Ionicons name={isAdded ? "checkmark-circle" : "add-circle-outline"} size={22} color={isAdded ? "#34c759" : theme.primary} />
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {spaceMembers.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Members ({spaceMembers.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {spaceMembers.map((m) => (
                  <View key={m.username} style={styles.chip}>
                    <Text style={styles.chipText}>{m.fname}</Text>
                    <TouchableOpacity onPress={() => removeSpaceMember(m.username)}>
                      <Ionicons name="close-circle" size={16} color={theme.subtext} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            style={[styles.createSpaceBtn, (spaceMembers.length === 0 || creatingSpace) && styles.createSpaceBtnDisabled]}
            onPress={handleCreateSpace}
            disabled={spaceMembers.length === 0 || creatingSpace}
          >
            <Text style={styles.createSpaceBtnText}>{creatingSpace ? "Creating..." : "Create Space →"}</Text>
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
        style={[styles.sidebar, { left: slideAnim.interpolate({ inputRange: [0, 1], outputRange: ["-65%", "0%"] }) }]}
      >
        <View style={styles.sidebarAvatar}>
          <Text style={styles.sidebarAvatarText}>{(fname || username)?.[0]?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={styles.sidebarName}>{fname} {lname}</Text>
        <Text style={styles.sidebarUsername}>@{username}</Text>

        <View style={styles.sidebarDivider} />

        <TouchableOpacity style={styles.sidebarItem} onPress={() => { closeMenu(); router.push("/settings"); }}>
          <Ionicons name="settings-outline" size={20} color="#8eacc8" />
          <Text style={styles.sidebarItemText}>Settings</Text>
        </TouchableOpacity>

        <View style={styles.sidebarItem}>
          <Ionicons name="moon-outline" size={20} color="#8eacc8" />
          <Text style={[styles.sidebarItemText, { flex: 1 }]}>Dark Mode</Text>
          <Switch
            value={theme.dark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#3e4a5a", true: theme.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.sidebarLogout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
          <Text style={styles.sidebarLogoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>
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
    root: { flex: 1, backgroundColor: theme.bg, overflow: "hidden" },
    container: { flex: 1, paddingHorizontal: 20 },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 52,
      marginBottom: 4,
    },
    menuBtn: {
      width: 42, height: 42,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 2, borderColor: theme.cardBorder,
      justifyContent: "center", alignItems: "center",
      ...cardShadow,
    },
    addBtn: {
      width: 42, height: 42,
      borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 2, borderColor: theme.cardBorder,
      justifyContent: "center", alignItems: "center",
      ...cardShadow,
    },

    greeting: { marginTop: 20, marginBottom: 20 },
    greetSub: { fontSize: 16, color: theme.subtext, fontWeight: "500" },
    greetName: { fontSize: 34, fontWeight: "800", color: theme.text, letterSpacing: -0.8 },

    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 30,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 14,
      gap: 10,
      ...cardShadow,
    },
    searchInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 0 },

    tabBar: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 30,
      padding: 4,
      marginBottom: 16,
      ...cardShadow,
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 26 },
    tabActive: { backgroundColor: theme.primary },
    tabText: { fontSize: 14, fontWeight: "600", color: theme.tabInactive },
    tabTextActive: { color: "#FFFFFF", fontWeight: "700" },

    convCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
      ...cardShadow,
    },
    avatar: {
      width: 50, height: 50,
      borderRadius: 25,
      justifyContent: "center", alignItems: "center",
      marginRight: 12,
      borderWidth: 2, borderColor: theme.cardBorder,
    },
    avatarText: { color: "#FFF", fontSize: 20, fontWeight: "700" },
    convContent: { flex: 1 },
    convRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
    convName: { fontSize: 15, fontWeight: "600", color: theme.text, flex: 1, marginRight: 8 },
    convTime: { fontSize: 12, color: theme.subtext },
    convPreview: { fontSize: 13, color: theme.subtext },
    unreadBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 5,
      marginLeft: 8,
    },
    unreadBadgeText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },

    searchResultCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      gap: 12,
      ...cardShadow,
    },

    emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: 6 },
    emptyText: { fontSize: 14, color: theme.subtext, textAlign: "center" },

    // Incoming call modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
    callModal: { width: "82%", backgroundColor: "#1a1a2e", borderWidth: 2, borderColor: "#2e2e4a", borderRadius: 24, padding: 30, alignItems: "center" },
    callAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center", marginBottom: 14 },
    callAvatarText: { color: "white", fontSize: 34, fontWeight: "bold" },
    callName: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
    callSubtitle: { color: "#aaa", fontSize: 14, marginBottom: 32 },
    callActions: { flexDirection: "row", gap: 40 },
    callActionGroup: { alignItems: "center", gap: 8 },
    acceptBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#34c759", justifyContent: "center", alignItems: "center" },
    declineBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#e53935", justifyContent: "center", alignItems: "center" },
    callActionLabel: { color: "#ccc", fontSize: 13 },

    // Create Space modal
    createSpaceModal: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: theme.bg },
    createSpaceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
    createSpaceTitle: { fontSize: 24, fontWeight: "800", color: theme.text },
    fieldLabel: { fontSize: 12, fontWeight: "700", color: theme.subtext, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
    optional: { fontWeight: "500", color: theme.placeholder, textTransform: "none" },
    fieldInput: {
      borderWidth: 2, borderColor: theme.inputBorder, borderRadius: 12,
      padding: 14, fontSize: 15, marginBottom: 16,
      backgroundColor: theme.inputBg, color: theme.text,
    },
    searchRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    searchIconBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" },
    spaceSearchList: { maxHeight: 180, marginBottom: 4 },
    spaceSearchItem: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingVertical: 10, paddingHorizontal: 4,
      borderBottomWidth: 1, borderColor: theme.cardBorder,
    },
    spaceSearchItemAdded: { backgroundColor: theme.addedItemBg },
    chipsScroll: { marginBottom: 8 },
    chip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: theme.chipBg, borderRadius: 20,
      paddingVertical: 6, paddingLeft: 12, paddingRight: 8, marginRight: 8,
      borderWidth: 1, borderColor: theme.cardBorder,
    },
    chipText: { fontSize: 14, color: theme.chipText, fontWeight: "600" },
    createSpaceBtn: {
      backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.cardBorder,
      borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: "auto", marginBottom: 16,
      shadowColor: theme.accent, shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5,
    },
    createSpaceBtnDisabled: { backgroundColor: theme.dark ? "#3a3a5a" : "#a0c4ff", shadowOpacity: 0 },
    createSpaceBtnText: { color: "white", fontSize: 16, fontWeight: "800" },

    // Sidebar
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100 },
    sidebar: {
      position: "absolute", top: 0, bottom: 0, width: "65%",
      backgroundColor: "#111827", zIndex: 200,
      paddingTop: 64, paddingHorizontal: 24, paddingBottom: 36,
      shadowColor: "#000", shadowOffset: { width: 6, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 20,
    },
    sidebarAvatar: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: theme.primary, justifyContent: "center", alignItems: "center",
      marginBottom: 12, borderWidth: 2, borderColor: "#2e3a4a",
    },
    sidebarAvatarText: { color: "#FFF", fontSize: 26, fontWeight: "700" },
    sidebarName: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 2 },
    sidebarUsername: { fontSize: 14, color: "#8eacc8" },
    sidebarDivider: { height: 1, backgroundColor: "#1e2d3d", marginVertical: 20 },
    sidebarItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
    sidebarItemText: { fontSize: 16, color: "#c8d8e8" },
    sidebarLogout: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
    sidebarLogoutText: { fontSize: 16, color: "#ff6b6b", fontWeight: "600" },
  });
};
