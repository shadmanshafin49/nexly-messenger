import React, { useState } from "react";
import axios from "axios";
import { router } from "expo-router";
import { BASE_URL } from "../config";
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";


export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/users/login`, { username, password });
      console.log("Login response:", res.data);

      // Pass only username to dashboard
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
      value={username}
      onChangeText={setUsername}
    />
    <TextInput
      style={styles.input}
      placeholder="Password"
      secureTextEntry
      value={password}
      onChangeText={setPassword}
    />
    <Button title="Login" onPress={handleLogin} />

    {/* Link to create account */}
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 15 }}>
      <Text>or </Text>
      <TouchableOpacity onPress={() => router.push("/accountCreation")}>
        <Text style={{ color: "blue" }}>Create Account</Text>
      </TouchableOpacity>
    </View>
  </View>
);

}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }
});
