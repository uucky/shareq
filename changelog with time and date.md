# ShareQ KTV - Detailed Changelog with Time and Date

## [2026-06-07 19:22:30]
### Fixed & Optimized
- **Static Assets Routing & Absolute Paths**: Updated stylesheet and javascript file links in `public/index.html` to use absolute paths (`/style.css` and `/app.js`). This completely resolves potential MIME type errors (`text/html` fallback matching `/.*/`) and severe loading lag on the dev server.
- **Diagnostics & Startup Logging**: Added public folder existence logging and an incoming request logger middleware in `server.js` to inspect and verify static asset requests on startup and runtime.
