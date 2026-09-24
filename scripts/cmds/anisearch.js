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

module.exports = {
  config: {
    name: "anisearch",
    aliases: ["amv", "animesearch"],
    version: "2.0",
    author: "xalman",
    countDown: 3,
    role: 0,
    description: "Search and get Anime TikTok videos",
    category: "ANIME & MEDIA",
    guide: "{pn} <anime name>"
  },

  onStart: async function ({ api, event, message, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");
    if (!query) return message.reply("❌ Please provide an anime name to search.");

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const API_URL = `${await getApiBaseUrl()}/api/anisearch?q=${encodeURIComponent(query)}`;

    try {
      const res = await axios.get(API_URL, { timeout: 15000 });
      const results = res.data.results;

      if (!results || results.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ No videos found for "${query}".`);
      }

      const video = results[0];
      const stream = await global.utils.getStreamFromURL(video.video_url);

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `🎬 𝗔𝗡𝗜𝗠𝗘 𝗦𝗘𝗔𝗥𝗖𝗛 𝗥𝗘𝗦𝗨𝗟𝗧
━━━━━━━━━━━━━━━━━━`;

      return api.sendMessage({
        body: msg,
        attachment: stream
      }, threadID, messageID);

    } catch (e) {
      console.error(e);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ Error fetching video. Please try again.");
    }
  }
};
