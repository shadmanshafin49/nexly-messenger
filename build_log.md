# Nexly Build Log

---

## [0.1.0] — Project Initialization

- Bootstrapped React Native frontend with Expo (`create-expo-app`)
- Initialized Node.js/Express backend
- Connected backend to MongoDB via Mongoose
- Set up Socket.IO on the server with a basic `connection`/`disconnect` handler

---

## [0.2.0] — Auth & User System

- Created `User` Mongoose model with fields: `fname`, `lname`, `email`, `username`, `password`, `createdAt`
- Passwords hashed with bcrypt (10 salt rounds) via a `pre("save")` hook
- Added `matchPassword` instance method for login comparison
- Implemented `POST /api/users/register` — validates fields, checks for duplicate username/email, creates user
- Implemented `POST /api/users/login` — validates credentials, returns user object (no token, session-less)
- Implemented `GET /api/users/search?query=` — case-insensitive regex search on username and email, excludes password from response

---

## [0.3.0] — Messaging System

- Created `Message` Mongoose model with fields: `sender`, `receiver`, `content`, `status`, timestamps
- Added custom shift cipher (`backend/utils/cipher/athash.js`) — encrypts content before saving, decrypts on retrieval
- Implemented `POST /api/messages` — saves encrypted message, emits `receive_message` to receiver's Socket.IO room
- Implemented `GET /api/messages/:user1/:user2` — fetches full conversation, decrypts content, marks incoming messages as `delivered` and emits `status_update` to sender
- Implemented `GET /api/messages/conversations/:username` — returns all unique conversations with latest message preview and partner name
- Implemented `PATCH /api/messages/read/:msgSender/:msgReceiver` — marks messages as `read`, emits `status_update` to sender
- Message routes refactored to accept `io` as a parameter (`createMessageRoutes(io)`)

---

## [0.4.0] — Frontend Screens

- **Welcome screen** (`app/index.js`) — landing page with link to login
- **Login screen** (`app/login.js`) — calls `POST /api/users/login`, navigates to dashboard with username/fname/lname params
- **Account creation screen** (`app/accountCreation.js`) — calls `POST /api/users/register`, navigates to dashboard on success
- **Dashboard screen** (`app/dashboard.js`) — search bar calls `GET /api/users/search`, lists results, taps open chat; hamburger menu modal shows profile info with logout and settings placeholder
- **Chat screen** (`app/chat.js`) — fetches conversation history, sends messages, renders chat bubbles (blue = mine, gray = theirs)
- Created `config.js` — platform-aware `BASE_URL` that resolves the correct backend IP for Android emulator, iOS simulator, and real device

---

## [0.5.0] — Real-Time & Message Status

- Socket.IO rooms: each user joins a personal room by username on `join` event
- Incoming messages delivered via `receive_message` socket event in real time
- Message delivery status: `sent` → `delivered` → `read`
- Status icons in chat bubbles (via Ionicons): single checkmark = sent, double gray = delivered, double blue = read
- `markAsRead` called on chat open and on new message receipt — triggers `PATCH /api/messages/read/...` and `status_update` socket event back to sender

---

## [0.6.0] — Typing Indicators

- Backend: added `typing` and `stop_typing` Socket.IO event handlers — relay the event to the target user's room via `socket.to(to).emit(...)`
- `join` handler now stores `socket.username` for use in typing event context
- Frontend: `handleTextChange` emits `typing` on every keystroke; debounced 1500ms timeout emits `stop_typing` on pause
- `sendMessage` cancels the debounce timeout and immediately emits `stop_typing` on send
- Chat screen listens for `typing`/`stop_typing` events and toggles `friendTyping` state
- Renders `"{name} is typing..."` in italic gray between the message list and input bar when active

---

## [0.8.0] — One-on-One Voice Calls (WebRTC)

- Backend: added 4 Socket.IO signaling relay events — `call_offer` (includes `callerFname`), `call_answer`, `ice_candidate`, `call_end`; all route to the target user's room without touching media
- New screen `app/call.js` — full WebRTC peer connection using `react-native-webrtc`:
  - Requests microphone permission via `mediaDevices.getUserMedia`
  - STUN servers: `stun.l.google.com:19302` + `stun1.l.google.com:19302`
  - Caller path: creates SDP offer → `setLocalDescription` → emits `call_offer`
  - Callee path: parses offer from nav params → `setRemoteDescription` → creates answer → `setLocalDescription` → emits `call_answer`
  - ICE candidates queued in `pendingCandidatesRef` if remote description not yet set, flushed immediately after
  - Connection state tracked via `onconnectionstatechange`; timer starts on `"connected"`
  - Mute toggle disables/enables local audio tracks in place
  - `teardown()` guarded by `cleanedUpRef` to prevent double-cleanup on unmount vs. hang-up
- `app/chat.js`: added phone icon button in header; navigates to `/call` with `isCaller: "true"` and caller's `fname`
- `app/dashboard.js`: persistent Socket.IO connection on mount; listens for `call_offer` and sets `incomingCall` state; incoming call modal (dark overlay) shows caller name with green Accept / red Decline buttons; decline emits `call_end` back to caller
- **Requires Expo dev build** — `react-native-webrtc` uses native modules not supported in Expo Go

---

## [0.7.0] — Message Timestamps

- `createdAt` already returned in all message API responses (Mongoose `{ timestamps: true }`)
- Added `formatTime(iso)` helper in chat screen:
  - Today → `"2:30 PM"`
  - Same year → `"Jan 5, 2:30 PM"`
  - Older → `"Jan 5 2024, 2:30 PM"`
  - Returns `""` if field is absent
- Timestamp displayed inside each bubble alongside status icon (my messages) or alone (their messages)
- Timestamp color: faded white on blue bubbles, faded dark on gray bubbles
