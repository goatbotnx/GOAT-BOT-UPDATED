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

module.exports = {
  config: {
    name: "applemusic",
    aliases: ["amusic"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search and download Apple Music songs" },
    longDescription: { en: "Search for a song on Apple Music and download it directly" },
    category: "ANIME & MEDIA",
    guide: { en: "{pn} <song name>\nExample: /applemusic Happy Nation" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;
    const query = args.join(" ");

    if (!query) {
      return message.reply("❌ Please provide a song name.\nExample: /applemusic Happy Nation");
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    const maxRetries = 2;
    let lastError = null;
    let results = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const searchUrl = `${await getApiBaseUrl()}/api/applemusicsearch?query=${encodeURIComponent(query)}&limit=6`;
        const searchRes = await axios.get(searchUrl, { timeout: 15000 });

        if (searchRes.data.status && searchRes.data.results && searchRes.data.results.length > 0) {
          results = searchRes.data.results.slice(0, 6);
          break;
        } else {
          throw new Error("No results found");
        }
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!results || results.length === 0) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ Failed to search: ${lastError?.message || "No results found"}`);
    }

    let msg = "🍎 𝗔𝗣𝗣𝗟𝗘 𝗠𝗨𝗦𝗜𝗖 𝗦𝗘𝗔𝗥𝗖𝗛\n━━━━━━━━━━━━━━━━━━\n";
    for (let i = 0; i < results.length; i++) {
      const track = results[i];
      msg += `${i + 1}. ${track.title}\n`;
      msg += `   👤 ${track.artist}\n`;
      msg += `   ⏱️ ${track.duration || "N/A"}\n\n`;
    }
    msg += `💬 Reply with a number (1-${results.length}) to download`;

    const attachments = [];
    for (const track of results) {
      if (!track.thumbnail) continue;
      try {
        const stream = await global.utils.getStreamFromURL(track.thumbnail);
        if (stream) attachments.push(stream);
      } catch {}
    }

    const sentMsg = await api.sendMessage(
      attachments.length ? { body: msg, attachment: attachments } : msg,
      threadID,
      messageID
    );

    api.setMessageReaction("✅", messageID, () => {}, true);

    global.GoatBot.onReply.set(sentMsg.messageID, {
      commandName: this.config.name,
      messageID: sentMsg.messageID,
      author: senderID,
      results: results
    });
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, body, senderID } = event;

    if (senderID !== Reply.author) {
      return api.sendMessage("❌ You are not authorized.", threadID, messageID);
    }

    const index = parseInt(body) - 1;
    if (isNaN(index) || index < 0 || index >= Reply.results.length) {
      return api.sendMessage(`❌ Invalid choice. Choose 1-${Reply.results.length}.`, threadID, messageID);
    }

    const track = Reply.results[index];
    const trackUrl = track.trackViewUrl;

    try {
      await api.unsendMessage(Reply.messageID, threadID);
    } catch {}

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const maxRetries = 2;
    let lastError = null;
    let downloadData = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const downloadUrl = `${await getApiBaseUrl()}/api/alldl?url=${encodeURIComponent(trackUrl)}`;
        const downloadRes = await axios.get(downloadUrl, { timeout: 30000 });
        const data = downloadRes.data;

        if (data.success && data.audios && data.audios.length > 0) {
          downloadData = data;
          break;
        } else {
          throw new Error("Failed to get download link");
        }
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!downloadData) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ Failed to download: ${lastError?.message || "Unknown error"}`, threadID, messageID);
    }

    try {
      const audioLink = downloadData.audios[0].audiourl;
      const format = downloadData.audios[0].format || "m4a";
      const title = downloadData.title || track.title;
      const artist = track.artist || "Unknown";

      const filePath = path.join(cacheDir, `${Date.now()}.${format}`);
      const audioRes = await axios({
        url: audioLink,
        method: "GET",
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 60000
      });

      fs.writeFileSync(filePath, Buffer.from(audioRes.data));

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `🍎 𝗔𝗣𝗣𝗟𝗘 𝗠𝗨𝗦𝗜𝗖 𝗦𝗢𝗡𝗚\n━━━━━━━━━━━━━━━━━━\n📌 Title: ${title}\n👤 Artist: ${artist}`;

      return api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (err) {
      console.error("Download error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ Failed to download: ${err.message || "Unknown error"}`, threadID, messageID);
    }
  }
};
