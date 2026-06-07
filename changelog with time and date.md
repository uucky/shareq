# ShareQ KTV - Change Log with Time and Date

## [2026-06-07 19:00:00]
### Refactored & Optimized on Dev
- **Twitch-Style Activity Chat Stream**: Redesigned the third column notification panel to render as a Twitch-style chat feed. Older items are printed at the top, and new items append to the bottom with an automatic scroll-to-bottom. Replaced the system notification popups from floating over the playlist (only direct dedications still float as popups).
- **Single-Row Playlist Item Layout**: Refactored the song list cards for both upcoming songs and historical list so that "Title", "Singer", and "Requester/dedication info" are layed out inline in a single flex row separated by a dot (`•`), instead of stacking vertically across three separate lines.
- **3-Column Nesting Layout Fix**: Corrected missing closing tags (`</div>` and `</section>`) for the playlist container card in `public/index.html`. This correctly snaps the Activity section to the independent third column on the right side rather than overlapping or stacking below the playlist queue.
- **Button Word-Wrapping Prevention**: Added `white-space: nowrap` rules to `.playlist-tab-btn`, `.btn-action`, and `.toast-filter-btn` to prevent critical terms like "待播歌单" from wrapping characters on narrower viewport widths.
- **Next Button Label Simplification**: Renamed the moderator control button label from "切歌 / 下一首" to "切歌".
- **Package.json Main Script Correction**: Updated `"main"` entry point from `index.js` to `server.js` in `package.json` to prevent Render from incorrectly searching for a missing `index.js` module during startup.

## [2026-06-06 22:30:00]
### Refactored & Optimized on Dev
- **3-Column Grid Layout**: Redesigned the main dashboard view into a 3-column layout on desktop viewports. System notifications/activity dynamic stream has been relocated to the static 3rd column on the right.
- **Priority (置顶) Re-implementation**: Shifted logic to a pure, non-stateful action. Pinned songs are instantly re-sorted to the top of the upcoming list (index 1), with no highlighted styling or flags.
- **Floating Emoji VFX scaling and area expansion**: Restored float container boundaries to full viewport (`100vw` by `100vh`) to allow drifting across the whole screen. Scaled desktop emoji sizes down from 5x to 3x (`--emoji-scale: 3`).
- **Compact Song List**: Reduced card padding from `12px 16px` to `8px 12px` and list gap from `8px` to `6px` for space efficiency.
- **UI Compact Mode Toggle**: Added a menu option to toggle a site-wide compact mode (`body.compact-mode`) which shrinks fonts and container paddings, saved and restored via localStorage.

## [2026-06-06 22:15:00]
### Added on Master
- **Interactive Gift Mute Switch**: Added mute button in `public/index.html` (within the interactive panel header). Persists `isSoundMuted` state in local storage (`shareq_gift_muted`). Excludes essential singing chimes.
- **5x Emoji Size Enhancement**: Floating emojis scaled up by 5x on desktop (`--emoji-scale: 5`), and adjusted via media queries to 2.2x on mobile screens (`--emoji-scale: 2.2`) inside `public/style.css` to prevent mobile view obstruction. Expanded container size to 550px for wider drift.

### Added on Dev
- **Dedicated Song Requests (指名点歌)**: Added a target selection dropdown field in the request form. The recipient of the dedication receives a stylish full-screen modal prompts to Accept/Decline the requested song.
- **Selective Toast History Badge Increments**: Configured `showToast` to only increment `unreadToastsCount` (unread count badge on the notification bell button) for 1-to-1 dedication events, keeping the UI clean from general room events.
