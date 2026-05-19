import React, { useState, useMemo } from "react";
import axios from "axios";
import { router } from "expo-router";
import { BASE_URL } from "../config";
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/users/login`, { username, password });
      router.replace({ pathname: "/dashboard", params: { username: res.data.user.username } });
    } catch (err) {
      console.log("Login error:", err.response?.data || err.message);
      alert("Login failed!");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nexly Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={theme.placeholder}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.placeholder}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 15 }}>
        <Text style={{ color: theme.text }}>or </Text>
        <TouchableOpacity onPress={() => router.push("/accountCreation")}>
          <Text style={{ color: theme.primary }}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: theme.bg },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: theme.text },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderColor: theme.inputBorder,
    backgroundColor: theme.inputBg,
    color: theme.text,
  },
});
