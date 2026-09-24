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
    name: "unblur",
    version: "2.3",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "unblur any image",
    category: "tools",
    guide: "{pn} [reply to image or paste url]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply } = event;
    const API_URL = `${await getApiBaseUrl()}/api/unblur`;

    let imageUrl;

    if (type === "message_reply" && messageReply.attachments[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } 
    else if (args[0] && args[0].startsWith("http")) {
      imageUrl = args[0];
    } 
    else {
      return api.sendMessage("Please reply to an image or provide a link!", threadID, messageID);
    }

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const response = await axios.post(API_URL, { url: imageUrl }, { 
        responseType: 'stream', 
        timeout: 600000 
      });

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage({
        body: "✨𝙝𝙚𝙧𝙚 𝙞𝙨 𝙮𝙤𝙪𝙧 𝙪𝙣𝙗𝙡𝙪𝙧 𝙞𝙢𝙖𝙜𝙚✨",
        attachment: response.data
      }, threadID, messageID);

    } catch (error) {
      console.error(error);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("✕ API Error!", threadID, messageID);
    }
  }
};
