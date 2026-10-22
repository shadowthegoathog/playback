# Playback source

This project is a static frontend plus a Websim backend. It is intended to be published as a Websim project; video uploads use the Websim account and file-upload services.

## Source files

- `index.html` is the page markup.
- `style.css` contains responsive dark/light themes and layout.
- `app.js` handles the feed, search, upload UI, and offline page export.
- `server.js` persists public video metadata in the project's SQLite database and requires a signed-in Websim account for uploads.
- `playback-logo.webp` is the optimized logo asset.

## Publish

Keep these files together at the project root and publish the project through Websim. The first request to the backend applies the idempotent database schema. No package manager or build step is needed.

Uploads are public and currently cannot be removed from the file host through this app. Users should only upload videos they own or have permission to publish. The app limits uploads to 100 MB and 20 per account per day. The Websim platform's own upload limits also apply.

The downloaded `playback-offline.html` is a visual snapshot only. Video feed and upload functionality require the published Websim project and its backend.
