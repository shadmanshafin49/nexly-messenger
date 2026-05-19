import { View, Text, Button, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

export default function Index() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Nexly 👋</Text>
      <Button title="Go to Login" onPress={() => router.push("/login")} />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: theme.bg },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: theme.text },
});
