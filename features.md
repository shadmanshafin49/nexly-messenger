# Nexly — Feature Spec

## Core Messaging
- One-on-one direct messages
- Group chats (with name, avatar, and member roles)
- Message threads / replies
- Edit and delete sent messages
- Message reactions (emoji)
- Read receipts (sent, delivered, read)
- Typing indicators
- Message forwarding
- Pinned messages per conversation
- Message search (global and per-chat)

## Media & Files
- Image, video, audio, and file sharing
- In-app media viewer / player
- Voice messages (record and send)
- GIF and sticker support
- Link previews with metadata (OG image, title, description)
- Camera access for in-app photo/video capture
- Document sharing (PDF, DOCX, etc.)

## Notifications
- Push notifications (mobile and desktop)
- In-app notification badges and toasts
- Per-conversation mute / snooze
- Do Not Disturb mode with schedule
- Mention alerts (@username, @everyone)
- Notification sound customization

## User Profiles & Identity
- Display name and username
- Profile photo and bio
- Online / Away / Offline status
- Custom status message with expiry
- Last seen timestamp (with privacy control)
- Verified badge support

## Privacy & Security
- End-to-end encryption (E2EE) for all messages
- Disappearing messages (configurable timer)
- Screenshot detection / blocking (optional)
- Two-factor authentication (2FA / TOTP)
- Blocked users list
- Report and flag content
- Message retention policies
- Privacy controls: who can see last seen, profile photo, status

## Calls
- One-on-one voice calls
- One-on-one video calls
- Group voice calls
- Group video calls
- Screen sharing during calls
- Call history log

## Discovery & Contacts
- Contact sync from phone/address book
- QR code profile sharing
- Invite via link
- Username search
- Suggested contacts

## Conversation Management
- Archive conversations
- Mark as unread
- Starred / bookmarked messages
- Chat folders / labels (e.g., Work, Personal)
- Bulk delete or leave chats

## Customization & Accessibility
- Light, dark, and system theme modes
- Custom chat wallpapers
- Font size adjustment
- Message text formatting (bold, italic, code, strikethrough)
- Keyboard shortcuts (desktop)
- Screen reader support and WCAG 2.1 AA compliance
- RTL language support

## Bots & Integrations
- Bot / webhook API for third-party integrations
- Slash commands inside chats
- Polls and surveys
- Scheduled messages
- Shared calendars / events inside group chats

## Administration (Groups & Teams)
- Admin and moderator roles
- Invite link management (revoke, expiry)
- Message approval / moderation queue
- Member join/leave audit log
- Anti-spam and rate limiting

## Cross-Platform & Sync
- iOS, Android, Web, Windows, macOS clients
- Multi-device login (session management)
- Real-time sync across devices
- Offline support with message queue
- Seamless handoff between devices

## Performance & Reliability
- Message delivery guarantees (at-least-once with dedup)
- Optimistic UI (instant local render before server ACK)
- Lazy loading of media and message history
- Background sync when app is closed
- Low-bandwidth mode
