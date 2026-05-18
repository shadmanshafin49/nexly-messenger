// app/config.js
import { Platform } from "react-native";

// Backend IPs
const BACKEND_IP_ANDROID = "10.0.2.2";           // Android emulator → host machine
const BACKEND_IP_IOS = "localhost";              // iOS simulator
const BACKEND_IP_REAL = "192.168.0.101";         // Real device on your LAN

// Automatically choose correct IP
const IP = Platform.OS === "android"
  ? BACKEND_IP_ANDROID
  : Platform.OS === "ios"
    ? BACKEND_IP_IOS
    : BACKEND_IP_REAL;

export const BASE_URL = "https://nexly-messenger-production.up.railway.app";
