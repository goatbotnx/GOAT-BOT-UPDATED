const axios = require("axios");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-hub";
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

const DEFAULT_DURATION = 120;

module.exports = {
  config: {
    name: "ai-song",
    aliases: ["aisong", "aimusic"],
    version: "4.1",
    author: "xalman",
    countDown: 20,
    role: 0,
    shortDescription: "Generate AI songs",
    longDescription: "Generate custom AI songs using a prompt and duration.",
    category: "AI-MUSIC",

    guide: {
      en: `
╭━━━〔 🎵 AI SONG GENERATOR 〕━━━╮

📝 𝗨𝘀𝗮𝗴𝗲:
{pn} <prompt> [--d <6-120>]

🔹 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
› {pn} A romantic song about Bangladesh
› {pn} My Song --d 60

⏱️ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: 6 – 120s (Default: 120)

╰━━━〔 ⚡ Powered by NX AI 〕━━━╯
`
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const input = args.join(" ").trim();

    if (!input) {
      return api.sendMessage(
        `🎵 𝗔𝗜 𝗦𝗢𝗡𝗚 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥

📝 Please provide a song prompt.

› {pn} My Bangladesh Song
› {pn} My Song --d 60

Type {pn} help for full guide.`,
        threadID,
        messageID
      );
    }

    if (input.toLowerCase() === "help" || input.toLowerCase() === "-h") {
      return api.sendMessage(
        this.config.guide.en.replace(/\{pn\}/g, "ai-song"),
        threadID,
        messageID
      );
    }

    let duration = DEFAULT_DURATION;

    const dMatch = input.match(/--d\s+(\d+)/i);
    if (dMatch) {
      const d = parseInt(dMatch[1]);
      if (!isNaN(d)) duration = Math.max(6, Math.min(120, d));
    }

    const prompt = input.replace(/--d\s+\d+/i, "").trim();

    if (!prompt) {
      return api.sendMessage("❌ Please provide a song prompt.", threadID, messageID);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const filePath = path.join(
      cacheDir,
      `xalman_ai_song_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
    );

    let loadingMessage = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      loadingMessage = await api.sendMessage(
        "🎵 Generating AI song.......",
        threadID
      );

      const response = await axios.get(
        `${await getApiBaseUrl()}/api/ai-song`,
        {
          params: { prompt, duration },
          responseType: "arraybuffer",
          timeout: 180000,
          maxContentLength: 100 * 1024 * 1024,
          maxBodyLength: 100 * 1024 * 1024
        }
      );

      const audioBuffer = Buffer.from(response.data);

      if (!audioBuffer || audioBuffer.length < 1000) {
        throw new Error("Invalid or empty audio received.");
      }

      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        throw new Error("API returned an invalid response.");
      }

      await fs.writeFile(filePath, audioBuffer);

      if (loadingMessage?.messageID) {
        try { await api.unsendMessage(loadingMessage.messageID); } catch {}
      }

      api.setMessageReaction("🎧", messageID, () => {}, true);

      return api.sendMessage(
        {
          body: `🎵 AI Song Generated\n⏱️ ${duration}s`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        async error => {
          try {
            if (await fs.pathExists(filePath)) await fs.remove(filePath);
          } catch {}

          if (error) {
            console.error("Audio send error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
          }
        },
        messageID
      );

    } catch (error) {
      console.error("AI Song Error:", error?.response?.data || error);

      api.setMessageReaction("❌", messageID, () => {}, true);

      if (loadingMessage?.messageID) {
        try { await api.unsendMessage(loadingMessage.messageID); } catch {}
      }

      try {
        if (await fs.pathExists(filePath)) await fs.remove(filePath);
      } catch {}

      return api.sendMessage(
        `❌ AI Song Generation Failed\n\n⚠️ ${error.message || "Unknown API error"}\n\nPlease try again.`,
        threadID,
        messageID
      );
    }
  }
};
