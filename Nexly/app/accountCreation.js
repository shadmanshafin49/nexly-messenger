import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";

export default function AccountCreationScreen() {
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleRegister = async () => {
    if (loading) return;
    if (!fname || !email || !username || !password || !repeatPassword) {
      alert("Please fill all required fields");
      return;
    }
    if (password !== repeatPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/users/register`, {
        fname, lname, email, username, password, repeatPassword,
      });
      router.replace({ pathname: "/dashboard", params: { username: res.data.user.username } });
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, optional, ...props }) => (
    <View>
      <Text style={styles.label}>
        {label}
        {optional && <Text style={styles.optional}> (optional)</Text>}
      </Text>
      <TextInput style={styles.input} placeholderTextColor={theme.placeholder} {...props} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.headSub}>Create</Text>
          <Text style={styles.headMain}>Account 🎉</Text>
          <Text style={styles.headHint}>Join the conversation today.</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, { marginRight: 8 }]}
                placeholder="Jane"
                placeholderTextColor={theme.placeholder}
                value={fname}
                onChangeText={setFname}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last Name <Text style={styles.optional}>(opt)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor={theme.placeholder}
                value={lname}
                onChangeText={setLname}
              />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="jane@example.com"
            placeholderTextColor={theme.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="janedoe"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat your password"
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            value={repeatPassword}
            onChangeText={setRepeatPassword}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{loading ? "Creating account..." : "Create Account →"}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already a member? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>Sign in</Text>
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
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 70, paddingBottom: 40 },

    heading: { marginBottom: 28 },
    headSub: { fontSize: 18, fontWeight: "600", color: theme.subtext },
    headMain: { fontSize: 40, fontWeight: "800", color: theme.text, letterSpacing: -1, marginBottom: 8 },
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

    nameRow: { flexDirection: "row" },
    label: { fontSize: 12, fontWeight: "700", color: theme.subtext, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.4 },
    optional: { fontWeight: "500", color: theme.placeholder, textTransform: "none" },
    input: {
      backgroundColor: theme.inputBg,
      borderWidth: 2,
      borderColor: theme.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: theme.text,
      marginBottom: 18,
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
