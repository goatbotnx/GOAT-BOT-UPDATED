const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-downloader";
let apiBaseUrl = null;
let apiConfigRequest = null;

async function getApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;

  if (!apiConfigRequest) {
    apiConfigRequest = axios
      .get(API_CONFIG_URL, { timeout: 15000 })
      .then(({ data }) => {
        const baseUrl = data?.[API_KEY];

        if (typeof baseUrl !== "string" || !baseUrl.trim()) {
          throw new Error(`Missing API key in apis.json: ${API_KEY}`);
        }

        apiBaseUrl = baseUrl.replace(/\/+$/, "");
        return apiBaseUrl;
      })
      .finally(() => {
        apiConfigRequest = null;
      });
  }

  return apiConfigRequest;
}
const fs = require("fs-extra");
const path = require("path");
const http = require("http");
const https = require("https");
const { pipeline } = require("stream/promises");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const HTTP_AGENT = new http.Agent({
  keepAlive: true,
  maxSockets: 32
});
const HTTPS_AGENT = new https.Agent({
  keepAlive: true,
  maxSockets: 32
});

function getUserAgent() {
  return USER_AGENTS[
    Math.floor(Math.random() * USER_AGENTS.length)
  ];
}

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function cleanText(text, max = 55) {
  if (!text) return "Untitled";

  const value = String(text)
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return value.length > max
    ? `${value.slice(0, max)}…`
    : value;
}

function getExtension(url, contentType, isAudio) {
  const value = String(url || "").toLowerCase();
  const type = String(contentType || "").toLowerCase();

  if (isAudio) {
    if (type.includes("mpeg") || value.includes(".mp3")) {
      return ".mp3";
    }

    if (type.includes("m4a") || value.includes(".m4a")) {
      return ".m4a";
    }

    if (type.includes("ogg") || value.includes(".ogg")) {
      return ".ogg";
    }

    if (type.includes("wav") || value.includes(".wav")) {
      return ".wav";
    }

    return ".mp3";
  }

  if (type.includes("webm") || value.includes(".webm")) {
    return ".webm";
  }

  if (type.includes("quicktime") || value.includes(".mov")) {
    return ".mov";
  }

  if (type.includes("gif") || value.includes(".gif")) {
    return ".gif";
  }

  return ".mp4";
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function collectMediaLinks(payload) {
  const videos = [];
  const audios = [];
  const seenVideos = new Set();
  const seenAudios = new Set();

  const addVideo = value => {
    if (isHttpUrl(value) && !seenVideos.has(value)) {
      seenVideos.add(value);
      videos.push(value);
    }
  };

  const addAudio = value => {
    if (isHttpUrl(value) && !seenAudios.has(value)) {
      seenAudios.add(value);
      audios.push(value);
    }
  };

  const walk = (node, context = null) => {
    if (Array.isArray(node)) {
      node.forEach(item => walk(item, context));
      return;
    }

    if (!node || typeof node !== "object") return;

    for (const [key, value] of Object.entries(node)) {
      const lowerKey = key.toLowerCase();
      const isAudioContainer =
        lowerKey === "audio" ||
        lowerKey === "audios" ||
        lowerKey === "audiourl" ||
        lowerKey === "audio_url";
      const isVideoContainer =
        lowerKey === "video" ||
        lowerKey === "videos" ||
        lowerKey === "downloads" ||
        lowerKey === "links";
      const isImageContainer =
        lowerKey === "image" ||
        lowerKey === "images" ||
        lowerKey === "photo" ||
        lowerKey === "photos" ||
        lowerKey === "thumbnail" ||
        lowerKey === "poster";

      if (isHttpUrl(value)) {
        if (
          isAudioContainer ||
          context === "audio" ||
          lowerKey === "streamurl" ||
          lowerKey === "stream_url"
        ) {
          addAudio(value);
        } else if (!isImageContainer && context !== "image") {
          addVideo(value);
        }
      }

      const nextContext = isAudioContainer
        ? "audio"
        : isVideoContainer
          ? "video"
          : isImageContainer
            ? "image"
            : context;

      walk(value, nextContext);
    }
  };

  walk(payload);
  return { videos, audios };
}

module.exports = {
  config: {
    name: "autodl",
    version: "22.0",
    author: "xalman",
    countDown: 1,
    role: 0,
    shortDescription: "Multi-Platform Media Downloader up to 22+",
    longDescription: "Download video/audio from supported platforms.",
    category: "ANIME & MEDIA",
    guide: "{pn} <link> (or just send the link)"
  },

  onStart: async function ({ api, event, args, message }) {
    const url = args[0];

    if (!url) {
      return message.reply("⚠️ Please provide a media link!");
    }

    return this.handleDownload(
      url,
      api,
      event,
      message,
      false
    );
  },

  onChat: async function ({ api, event, message }) {
    const { body, senderID } = event;

    if (!body || senderID === api.getCurrentUserID()) {
      return;
    }

    const match = body.match(/(https?:\/\/[^\s]+)/i);

    if (!match) return;

    const url = match[0].replace(/[)\]}>.,]+$/, "");

    const supported = [
      "tiktok.com",
      "facebook.com",
      "fb.com",
      "fb.watch",
      "instagram.com",
      "instagr.am",
      "youtube.com",
      "youtu.be",
      "tumblr.com",
      "l.likee.video", 
      "likee.video",
      "pinterest.com",
      "pin.it",
      "twitter.com",
      "x.com",
      "threads.net",
      "threads.com",
      "terabox.com",
      "1024terabox.com",
      "spotify.link",
      "capcut.com",
      "capcut.net",
      "spotify.com",
      "soundcloud.com",
      "snapchat.com",
      "snap.com",
      "reddit.com",
      "redd.it",
      "linkedin.com",
      "lnkd.in",
      "kuaishou.com",
      "kwai.com",
      "douyin.com",
      "dailymotion.com",
      "dai.ly",
      "bsky.app",
      "bsky.social",
      "music.apple.com"
    ];

    if (
      !supported.some(domain =>
        url.toLowerCase().includes(domain)
      )
    ) {
      return;
    }

    return this.handleDownload(
      url,
      api,
      event,
      message,
      true
    );
  },

  handleDownload: async function (
    url,
    api,
    event,
    message,
    isAuto = false
  ) {
    const { messageID } = event;
    const start = Date.now();
    const DOWNLOADER_API = `${await getApiBaseUrl()}/api/video?url=`;

    let filePath = null;

    const react = emoji => {
      try {
        if (typeof api.setMessageReaction === "function") {
          api.setMessageReaction(
            emoji,
            messageID,
            () => {},
            true
          );
        }
      } catch {}
    };

    try {
      react("⏳");

      const apiUrl =
        `${DOWNLOADER_API}${encodeURIComponent(url)}`;

      const apiResponse = await axios.get(apiUrl, {
        timeout: 30000,
        maxRedirects: 10,
        headers: {
          "User-Agent": getUserAgent(),
          "Accept": "application/json"
        }
      });

      const apiData = apiResponse.data;

      if (
        apiData?.success !== true ||
        apiData?.data?.success === false
      ) {
        throw new Error(
          apiData?.error ||
          apiData?.data?.error ||
          "API returned an unsuccessful response."
        );
      }

      const result = apiData.data || {};
      const { videos, audios } =
        collectMediaLinks(result);

      const videoUrl =
        videos[0] ||
        (isHttpUrl(result.url) ? result.url : null);

      const audioUrl =
        audios[0] ||
        (isHttpUrl(result.audiourl)
          ? result.audiourl
          : null);

      let primaryUrl;
      let isAudio = false;

      if (videoUrl) {
        primaryUrl = videoUrl;
        isAudio = false;
      } else if (audioUrl) {
        primaryUrl = audioUrl;
        isAudio = true;
      } else {
        throw new Error(
          "No video or audio URL found."
        );
      }

      const title =
        result.title ||
        "Untitled";

      const platform =
        apiData.platform ||
        "Unknown";

      const quality =
        result.quality ||
        result.videos?.[0]?.quality ||
        result.audios?.[0]?.quality ||
        (isAudio ? "Audio" : "Video");

      const cacheDir =
        path.join(
          __dirname,
          "cache"
        );

      await fs.ensureDir(
        cacheDir
      );

      let streamRes;
      let lastError;

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        try {
          streamRes = await axios({
            method: "GET",
            url: primaryUrl,
            responseType: "stream",
            timeout: 120000,
            maxRedirects: 10,
            maxContentLength: MAX_FILE_SIZE,
            maxBodyLength: MAX_FILE_SIZE,
            httpAgent: HTTP_AGENT,
            httpsAgent: HTTPS_AGENT,
            headers: {
              "User-Agent": getUserAgent(),
              "Accept": "*/*",
              "Connection": "keep-alive",
              "Referer":
                platform.toLowerCase() === "pinterest"
                  ? "https://www.pinterest.com/"
                  : "https://www.google.com/"
            },
            validateStatus: status =>
              status >= 200 &&
              status < 400
          });

          break;
        } catch (error) {
          lastError = error;

          if (attempt < 3) {
            await new Promise(resolve =>
              setTimeout(
                resolve,
                attempt * 1500
              )
            );
          }
        }
      }

      if (!streamRes) {
        throw new Error(
          lastError?.message ||
          "Unable to connect to media server."
        );
      }

      const contentType =
        String(
          streamRes.headers[
            "content-type"
          ] || ""
        ).toLowerCase();

      const contentLength =
        Number(
          streamRes.headers[
            "content-length"
          ] || 0
        );

      if (
        contentLength >
        MAX_FILE_SIZE
      ) {
        streamRes.data.destroy();

        throw new Error(
          "File exceeds 100 MB limit."
        );
      }

      if (
        contentType.includes(
          "text/html"
        ) ||
        contentType.includes(
          "application/json"
        ) ||
        contentType.includes(
          "text/plain"
        )
      ) {
        streamRes.data.destroy();

        throw new Error(
          "The media URL returned an invalid response."
        );
      }

      const ext =
        getExtension(
          primaryUrl,
          contentType,
          isAudio
        );

      const fileName =
        `alldl_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}${ext}`;

      filePath =
        path.join(
          cacheDir,
          fileName
        );

      const writer =
        fs.createWriteStream(
          filePath,
          { highWaterMark: 1024 * 1024 }
        );

      let downloaded =
        0;

      streamRes.data.on(
        "data",
        chunk => {
          downloaded += chunk.length;

          if (
            downloaded >
            MAX_FILE_SIZE
          ) {
            const error =
              new Error(
                "File exceeds 100 MB limit."
              );

            streamRes.data.destroy(
              error
            );

            writer.destroy(
              error
            );
          }
        }
      );

      streamRes.data.on(
        "error",
        error => {
          writer.destroy(
            error
          );
        }
      );

      await pipeline(
        streamRes.data,
        writer
      );

      const stats =
        await fs.stat(
          filePath
        );

      if (!stats.size) {
        await fs.remove(
          filePath
        );

        filePath = null;

        throw new Error(
          "Downloaded file is empty."
        );
      }

      if (
        stats.size >
        MAX_FILE_SIZE
      ) {
        await fs.remove(
          filePath
        );

        filePath = null;

        throw new Error(
          "File exceeds 100 MB limit."
        );
      }

      const elapsed =
        (
          (Date.now() - start) /
          1000
        ).toFixed(2);

      const shortTitle =
        cleanText(title);

      const mediaType =
        isAudio
          ? "🎵 AUDIO"
          : "🎬 VIDEO";

      const caption =
`🎬 DOWNLOAD COMPLETE 🎬
────────────────────
🔻 TITLE — ${shortTitle}
🔻 PLATFORM — ${String(platform).toUpperCase()}
🔻 FILE — ${mediaType}
🔻 QUALITY — ${quality}
🔻 SIZE — ${formatSize(stats.size)}
🔻 TIME — ${elapsed}s
────────────────────
⚙️ POWERED BY XALMAN`;

      await message.reply({
        body: caption,
        attachment:
          fs.createReadStream(
            filePath
          )
      });

      await fs.remove(
        filePath
      );

      filePath = null;

      react("✅");

    } catch (error) {
      console.error(
        "[ALLDL ERROR]",
        error.message
      );

      console.error(
        "Code:",
        error.code || "N/A"
      );

      console.error(
        "URL:",
        error.config?.url || url
      );

      try {
        if (
          filePath &&
          await fs.pathExists(
            filePath
          )
        ) {
          await fs.remove(
            filePath
          );
        }
      } catch {}

      react("❌");

      if (!isAuto) {
        let errorMessage =
          error.message ||
          "Download failed.";

        if (
          error.code ===
          "ECONNRESET"
        ) {
          errorMessage =
            "Connection reset by media server. Please try again.";
        }

        if (
          error.code ===
            "ETIMEDOUT" ||
          error.code ===
            "ECONNABORTED"
        ) {
          errorMessage =
            "Download timed out. Please try again.";
        }

        if (
          error.code ===
          "ERR_STREAM_PREMATURE_CLOSE"
        ) {
          errorMessage =
            "Media stream closed unexpectedly. Please try again.";
        }

        if (
          error.response?.status ===
          403
        ) {
          errorMessage =
            "Media server denied access.";
        }

        if (
          error.response?.status ===
          404
        ) {
          errorMessage =
            "Media URL expired or not found.";
        }

        await message.reply(
          `❌ ${errorMessage}`
        );
      }
    }
  }
};
