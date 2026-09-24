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
    name: "memevid",
    aliases: ["memevideo"],
    version: "3.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    description: "Get a random meme video with auto-retry",
    category: "ANIME & MEDIA",
    guide: "{pn}"
  },

  onStart: async function ({ api, event, message }) {
    const { messageID, threadID } = event;
    const CACHE_DIR = path.join(__dirname, "cache");
    const MAX_RETRIES = 3;
    const xalman_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    api.setMessageReaction("⏳", messageID, () => {}, true);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await axios.get(`${await getApiBaseUrl()}/api/memevid`, { timeout: 10000 });
        const videoUrl = res.data.url;

        if (!videoUrl) {
          throw new Error("No video URL found");
        }

        if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

        const filePath = path.join(CACHE_DIR, `meme_${Date.now()}.mp4`);

        const response = await axios({
          method: 'get',
          url: videoUrl,
          headers: { "User-Agent": xalman_UA },
          responseType: 'stream',
          timeout: 20000
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        api.setMessageReaction("✅", messageID, () => {}, true);

        const msg = `🎬 𝗠𝗘𝗠𝗘 𝗩𝗜𝗗𝗘𝗢\n━━━━━━━━━━━━━━━━━━\nHere is your meme! 😙`;

        return api.sendMessage({
          body: msg,
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
          }
        });

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt === MAX_RETRIES) {
          api.setMessageReaction("❌", messageID, () => {}, true);
          return message.reply(`❌ Failed after ${MAX_RETRIES} attempts. Please try again later.`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
};
