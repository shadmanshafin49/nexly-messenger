import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { BASE_URL } from "../config";

export default function AccountCreationScreen() {
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const handleRegister = async () => {
    if (!fname || !email || !username || !password || !repeatPassword) {
      alert("Please fill all required fields");
      return;
    }
    if (password !== repeatPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/users/register`, {
        fname, lname, email, username, password, repeatPassword
      });
      console.log("Registration success:", res.data);
      alert("Account created successfully!");

      // Navigate to dashboard with the username
      router.replace({ pathname: "/dashboard", params: { username: res.data.user.username } });
    } catch (err) {
      console.log("Registration error:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={fname}
        onChangeText={setFname}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name (optional)"
        value={lname}
        onChangeText={setLname}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
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
      <TextInput
        style={styles.input}
        placeholder="Repeat Password"
        secureTextEntry
        value={repeatPassword}
        onChangeText={setRepeatPassword}
      />
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }
});
