import React, { useState, useMemo } from "react";
import axios from "axios";
import { router } from "expo-router";
import { BASE_URL } from "../config";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/users/login`, { username, password });
      router.replace({ pathname: "/dashboard", params: { username: res.data.user.username } });
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.headSub}>Welcome</Text>
          <Text style={styles.headMain}>back! 👋</Text>
          <Text style={styles.headHint}>Sign in to continue chatting.</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. johndoe"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{loading ? "Signing in..." : "Login →"}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/accountCreation")}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => {
  const shadow = {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: theme.dark ? 0.8 : 1,
    shadowRadius: 0,
    elevation: 5,
  };

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },

    heading: { marginBottom: 32 },
    headSub: { fontSize: 18, fontWeight: "600", color: theme.subtext },
    headMain: { fontSize: 42, fontWeight: "800", color: theme.text, letterSpacing: -1, marginBottom: 8 },
    headHint: { fontSize: 15, color: theme.subtext },

    card: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
      ...shadow,
    },

    label: { fontSize: 13, fontWeight: "700", color: theme.subtext, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
    input: {
      backgroundColor: theme.inputBg,
      borderWidth: 2,
      borderColor: theme.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: theme.text,
      marginBottom: 20,
    },

    primaryBtn: {
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 4,
      shadowColor: theme.accent,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 5,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },

    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
    footerText: { fontSize: 15, color: theme.subtext },
    footerLink: { fontSize: 15, fontWeight: "700", color: theme.primary },
  });
};
