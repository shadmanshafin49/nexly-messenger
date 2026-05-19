import "../global.css";
import { Stack } from "expo-router";
import { View, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { ThemeProvider } from "../context/ThemeContext";

function WebPhoneFrame({ children }) {
  const { width, height } = useWindowDimensions();

  if (!width || !height) {
    return <View style={styles.webOuter}>{children}</View>;
  }

  const frameHeight = height;
  const frameWidth = frameHeight * (9 / 16);
  const finalWidth = frameWidth > width ? width : frameWidth;
  const finalHeight = finalWidth * (16 / 9);

  return (
    <View style={styles.webOuter}>
      <View style={[styles.phoneFrame, { width: finalWidth, height: finalHeight }]}>
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const stack = (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );

  if (Platform.OS === "web") {
    return <WebPhoneFrame>{stack}</WebPhoneFrame>;
  }

  return stack;
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneFrame: {
    overflow: "hidden",
    backgroundColor: "#fff",
  },
});
