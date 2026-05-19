import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

export default function Index() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {/* Brand area */}
      <View style={styles.brand}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>💬</Text>
        </View>
        <Text style={styles.appName}>Nexly</Text>
        <Text style={styles.tagline}>Connect freely, together.</Text>
      </View>

      {/* CTA area */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Get Started →</Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginHint}>Already a member? </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.loginLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      paddingHorizontal: 28,
      justifyContent: "space-between",
      paddingTop: 120,
      paddingBottom: 64,
    },

    brand: { alignItems: "center" },
    logoBox: {
      width: 100,
      height: 100,
      borderRadius: 28,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
      ...shadow,
    },
    logoEmoji: { fontSize: 46 },
    appName: {
      fontSize: 52,
      fontWeight: "800",
      color: theme.primary,
      letterSpacing: -1.5,
      marginBottom: 10,
    },
    tagline: {
      fontSize: 17,
      color: theme.subtext,
      fontWeight: "500",
      textAlign: "center",
    },

    cta: { gap: 16 },
    primaryBtn: {
      backgroundColor: theme.accent,
      borderWidth: 2,
      borderColor: theme.cardBorder,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center",
      ...shadow,
    },
    primaryBtnText: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },

    loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
    loginHint: { fontSize: 15, color: theme.subtext },
    loginLink: { fontSize: 15, fontWeight: "700", color: theme.primary },
  });
};
