import React, { createContext, useContext, useState } from "react";

export const light = {
  dark: false,
  bg: "#FAF7F0",
  surface: "#FFFFFF",
  primary: "#5B4FE8",
  accent: "#F7C843",
  text: "#1A1A1A",
  subtext: "#666666",
  cardBorder: "#1A1A1A",
  inputBg: "#FFFFFF",
  inputBorder: "#1A1A1A",
  placeholder: "#999999",
  tabInactive: "#888888",
  sectionLabel: "#666666",
  unreadText: "#1A1A1A",
  theirBubble: "#FFFFFF",
  theirBubbleText: "#1A1A1A",
  chipBg: "#EDE8FF",
  chipText: "#5B4FE8",
  addedItemBg: "#F0FFF4",
  shadowColor: "#1A1A1A",
};

export const dark = {
  dark: true,
  bg: "#111111",
  surface: "#1E1E1E",
  primary: "#7B6FF8",
  accent: "#F7C843",
  text: "#F0EDE4",
  subtext: "#888888",
  cardBorder: "#3A3A3A",
  inputBg: "#262626",
  inputBorder: "#3A3A3A",
  placeholder: "#555555",
  tabInactive: "#555555",
  sectionLabel: "#888888",
  unreadText: "#F0EDE4",
  theirBubble: "#2A2A2A",
  theirBubbleText: "#F0EDE4",
  chipBg: "#2A2A40",
  chipText: "#9C8FFF",
  addedItemBg: "#0A1E0A",
  shadowColor: "#000000",
};

const ThemeContext = createContext({ theme: light, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, toggleTheme: () => setIsDark((v) => !v) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
