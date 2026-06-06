# ShareQ KTV - Change Log with Time and Date

## [2026-06-06 22:15:00]
### Added on Master
- **Interactive Gift Mute Switch**: Added mute button in `public/index.html` (within the interactive panel header). Persists `isSoundMuted` state in local storage (`shareq_gift_muted`). Excludes essential singing chimes.
- **5x Emoji Size Enhancement**: Floating emojis scaled up by 5x on desktop (`--emoji-scale: 5`), and adjusted via media queries to 2.2x on mobile screens (`--emoji-scale: 2.2`) inside `public/style.css` to prevent mobile view obstruction. Expanded container size to 550px for wider drift.

### Added on Dev
- **Dedicated Song Requests (指名点歌)**: Added a target selection dropdown field in the request form. The recipient of the dedication receives a stylish full-screen modal prompts to Accept/Decline the requested song.
- **Selective Toast History Badge Increments**: Configured `showToast` to only increment `unreadToastsCount` (unread count badge on the notification bell button) for 1-to-1 dedication events, keeping the UI clean from general room events.
