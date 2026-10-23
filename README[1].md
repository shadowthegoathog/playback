# PlayBack — Render-compatible starter

This version replaces the Websim-only backend with a small Express server.

## Render settings
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Root directory: leave blank

## Important storage note
This starter stores uploaded video files in `uploads/` and video metadata in `videos.json`. On Render's standard free web service filesystem, these files are not guaranteed to persist across redeploys/restarts. This is suitable for testing the site, not reliable long-term public video hosting. For durable public uploads, connect persistent storage and a database before inviting people to upload.

Uploads are public. Only upload videos you own or have permission to share. File limit: 100 MB.
