export const schema =   "CREATE TABLE IF NOT EXISTS videos (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
  "user_id TEXT NOT NULL, " +
  "username TEXT NOT NULL, " +
  "title TEXT NOT NULL, " +
  "video_url TEXT NOT NULL, " +
  "content_type TEXT NOT NULL, " +
  "file_size INTEGER NOT NULL, " +
  "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" +
  "); CREATE INDEX IF NOT EXISTS videos_recent ON videos (id DESC); CREATE INDEX IF NOT EXISTS videos_user ON videos (user_id, id DESC);";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const json = (data, status = 200) => Response.json(data, { status });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/videos") {
      const userId = request.headers.get("x-websim-user-id");
      const { results } = await env.DB
        .prepare("SELECT id, user_id, username, title, video_url, content_type, file_size, created_at FROM videos ORDER BY id DESC LIMIT 40")
        .all();
      return json(results.map(({ user_id, ...video }) => ({ ...video, is_owner: Boolean(userId && userId === user_id) })));
    }

    if (request.method === "POST" && url.pathname === "/api/videos") {
      const userId = request.headers.get("x-websim-user-id");
      if (!userId) return json({ error: "Sign in to Websim before uploading." }, 401);
      const username = request.headers.get("x-websim-username");
      if (!username) return json({ error: "Could not verify the uploading account." }, 401);

      let body;
      try { body = await request.json(); }
      catch { return json({ error: "Request must contain valid JSON." }, 400); }

      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Request body must be a JSON object." }, 400);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : "";
      const contentType = typeof body.content_type === "string" ? body.content_type.toLowerCase() : "";
      const fileSize = body.file_size;
      if (!title || title.length > 120) return json({ error: "Title must be between 1 and 120 characters." }, 400);
      if (!contentType.startsWith("video/")) return json({ error: "Only video files can be published." }, 400);
      if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_VIDEO_BYTES) return json({ error: "Video must be smaller than 100 MB." }, 400);
      let parsedVideoUrl;
      try { parsedVideoUrl = new URL(videoUrl); }
      catch { return json({ error: "Uploaded video URL is invalid." }, 400); }
      if (parsedVideoUrl.protocol !== "https:" || videoUrl.length > 2048) return json({ error: "Uploaded video URL is invalid." }, 400);

      const { count } = await env.DB
        .prepare("SELECT COUNT(*) AS count FROM videos WHERE user_id = ? AND created_at >= datetime('now', '-1 day')")
        .bind(userId)
        .first();
      if (count >= 20) return json({ error: "Upload limit reached. Try again tomorrow." }, 429);

      const result = await env.DB
        .prepare("INSERT INTO videos (user_id, username, title, video_url, content_type, file_size) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(userId, username.slice(0, 80), title, videoUrl, contentType.slice(0, 120), fileSize)
        .run();
      return json({ ok: true, id: result.meta.last_row_id }, 201);
    }

    return json({ error: "Not found." }, 404);
  },
};
