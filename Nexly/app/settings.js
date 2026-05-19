import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace("/dashboard")}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  backBtn: { marginTop: 40, marginBottom: 20, padding: 6, alignSelf: "flex-start" },
  backText: { fontSize: 22, color: "#007AFF" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111" },
});
