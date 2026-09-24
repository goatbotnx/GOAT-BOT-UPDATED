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
    name: "tiktok",
    aliases: ["tik", "tt"],
    version: "1.2.0",
    author: "xalman",
    countDown: 10,
    role: 0,
    shortDescription: "Search and download TikTok videos with reply support",
    category: "ANIME & MEDIA",
    guide: "{pn} [query] or {pn} [query] -list"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const API_URL = `${await getApiBaseUrl()}/api/tik`;

    if (args.length === 0) {
      return api.sendMessage("╭─❍\n│ Usage: {pn} [query]\n│ List: {pn} [query] -list\n╰───────────⟡", threadID, messageID);
    }

    const isList = args.includes("-list");
    const searchQuery = args.filter(arg => arg !== "-list").join(" ");

    if (!searchQuery) return api.sendMessage("✕ Please provide a search query!", threadID, messageID);

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const res = await axios.get(`${API_URL}?q=${encodeURIComponent(searchQuery)}`);
      const results = res.data.results;

      if (!results || results.length === 0) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("✕ No videos found!", threadID, messageID);
      }

      if (isList) {
        let msg = `❖ 𝗧𝗜𝗞𝗧𝗢𝗞 𝗦𝗘𝗔𝗥𝗖𝗛 ❖\n━━━━━━━━━━━━━━━━━━\n`;
        let attachments = [];

        for (let i = 0; i < Math.min(6, results.length); i++) {
          msg += `${i + 1}. ${results[i].title}\n👤 Author: ${results[i].author}\n\n`;
          const thumbStream = (await axios.get(results[i].thumbnail, { responseType: 'stream' })).data;
          attachments.push(thumbStream);
        }

        msg += `━━━━━━━━━━━━━━━━━━\nReply with the number to download!`;
        api.setMessageReaction("📜", messageID, () => {}, true);

        return api.sendMessage({ body: msg, attachment: attachments }, threadID, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            results: results
          });
        }, messageID);
      }

      api.setMessageReaction("📥", messageID, () => {}, true);
      const videoStream = (await axios.get(results[0].video_url, { responseType: 'stream' })).data;

      return api.sendMessage({
        attachment: videoStream
      }, threadID, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("✕ API Error or Timeout!", threadID, messageID);
    }
  },

  onReply: async function ({ api, event, Reply, args }) {
    const { threadID, messageID, body, senderID } = event;
    const { results, author } = Reply;

    if (senderID !== author) return;

    const index = parseInt(body) - 1;
    if (isNaN(index) || index < 0 || index >= results.length) {
      return api.sendMessage("✕ Invalid selection!", threadID, messageID);
    }

    api.unsendMessage(Reply.messageID);
    api.setMessageReaction("📥", messageID, () => {}, true);

    try {
      const videoStream = (await axios.get(results[index].video_url, { responseType: 'stream' })).data;
      return api.sendMessage({
        body: `❖ 𝗧𝗜𝗞𝗧𝗢𝗞 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 ❖\n━━━━━━━━━━━━━━━━━━\n📝 Title: ${results[index].title}`,
        attachment: videoStream
      }, threadID, messageID);
    } catch (error) {
      return api.sendMessage("✕ Failed to download video!", threadID, messageID);
    }
  }
};
