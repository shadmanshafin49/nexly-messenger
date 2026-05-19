import React, { useState, useMemo } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
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

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
        fname, lname, email, username, password, repeatPassword,
      });
      alert("Account created successfully!");
      router.replace({ pathname: "/dashboard", params: { username: res.data.user.username } });
    } catch (err) {
      console.log("Registration error:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput style={styles.input} placeholder="First Name" placeholderTextColor={theme.placeholder} value={fname} onChangeText={setFname} />
      <TextInput style={styles.input} placeholder="Last Name (optional)" placeholderTextColor={theme.placeholder} value={lname} onChangeText={setLname} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Username" placeholderTextColor={theme.placeholder} value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.placeholder} secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Repeat Password" placeholderTextColor={theme.placeholder} secureTextEntry value={repeatPassword} onChangeText={setRepeatPassword} />
      <Button title="Register" onPress={handleRegister} />
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
