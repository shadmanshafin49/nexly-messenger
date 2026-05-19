# Nexly

A mobile messaging app I'm building to understand how real-time chat applications work under the hood — things like WebSockets, message delivery, encryption, and user presence. Not production software, just me poking at ideas and seeing what sticks.

Built with React Native (Expo) on the frontend and Node.js + Socket.IO + MongoDB on the backend.

---

## What's in here

- User registration and login (bcrypt password hashing)
- Search for users by username or email
- Real-time messaging via Socket.IO
- Message delivery status — sent, delivered, read (with checkmark icons)
- Typing indicators
- Message timestamps
- Basic message encryption (custom shift cipher before storing to MongoDB)
- Voice calls (WebRTC) — requires an Expo dev build, not supported in Expo Go
- Photo sending (Cloudinary)
- Message reactions (double-tap to ❤️)
- Animated slide-in side drawer with profile info, logout, and settings
- Dashboard conversation list updates in real time
- Unread message indicators

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React Native, Expo Router |
| Backend | Node.js, Express |
| Real-time | Socket.IO |
| Database | MongoDB (Mongoose) |
| Auth | bcrypt |
| Media | Cloudinary (image uploads) |
| Calls | react-native-webrtc (requires dev build) |

---

## Running it locally

### Backend

Create a `.env` file inside `backend/`:
```
MONGO_URI=mongodb://localhost:27017/nexly
PORT=5000
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd Nexly
npm install
npx expo start
```

Open in Expo Go on your phone or an Android/iOS emulator. Update `Nexly/config.js` with your machine's local IP if testing on a real device.

---

## Notes

This is a learning project. The goal is to understand the mechanics of a messaging app, not ship something polished. Corners are cut, things will break, and that's fine.
