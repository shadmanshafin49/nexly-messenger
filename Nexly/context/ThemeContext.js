import React, { createContext, useContext, useState } from "react";

const light = {
  dark: false,
  bg: "#f8f8f8",
  surface: "#ffffff",
  text: "#000000",
  subtext: "#888888",
  border: "#e5e5ea",
  inputBg: "#ffffff",
  inputBorder: "#cccccc",
  placeholder: "#aaaaaa",
  tabInactive: "#aaaaaa",
  sectionLabel: "#888888",
  unreadText: "#000000",
  theirBubble: "#e5e5ea",
  theirBubbleText: "#000000",
  chipBg: "#e8f0fe",
  chipText: "#007AFF",
  addedItemBg: "#f0fff4",
  primary: "#007AFF",
};

const dark = {
  dark: true,
  bg: "#0d0d0d",
  surface: "#1c1c1e",
  text: "#ffffff",
  subtext: "#8e8e93",
  border: "#38383a",
  inputBg: "#2c2c2e",
  inputBorder: "#48484a",
  placeholder: "#636366",
  tabInactive: "#636366",
  sectionLabel: "#8e8e93",
  unreadText: "#ffffff",
  theirBubble: "#3a3a3c",
  theirBubbleText: "#ffffff",
  chipBg: "#1a2a4a",
  chipText: "#4da3ff",
  addedItemBg: "#0a1e0a",
  primary: "#007AFF",
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
