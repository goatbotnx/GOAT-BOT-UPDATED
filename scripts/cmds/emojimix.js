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
    name: "emojimix",
    aliases: ["mix"],
    version: "1.0.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Mix two emojis into one image",
    category: "FUN & SOCIAL",
    guide: "{pn} [emoji1] [emoji2]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const API_URL = `${await getApiBaseUrl()}/api/emojimix`;

    if (args.length < 2) {
      return api.sendMessage("╭─❍\n│ Usage: {pn} 🥺 🙏\n╰───────────⟡", threadID, messageID);
    }

    const emoji1 = args[0];
    const emoji2 = args[1];

    api.setMessageReaction("🎨", messageID, () => {}, true);

    try {
      const res = await axios.get(`${API_URL}?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`, {
        responseType: 'stream'
      });

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage({
        body: "❖ 𝗘𝗠𝗢𝗝𝗜-𝗠𝗜𝗫 ❖\n━━━━━━━━━━━━━━━━━━",
        attachment: res.data
      }, threadID, messageID);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("✕ These emojis cannot be mixed!", threadID, messageID);
    }
  }
};
