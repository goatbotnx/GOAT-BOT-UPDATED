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
    name: "freeimage",
    aliases: ["freeimg", "imghost"],
    version: "1.0.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Upload image to FreeImage via URL",
    category: "tools",
    guide: "{pn} [reply to an image]"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, type, messageReply } = event;
    const API_URL = `${await getApiBaseUrl()}/api/imghost`;

    let imageUrl;
    if (type === "message_reply" && messageReply.attachments[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else {
      return api.sendMessage("╭─❍\n│ Please reply to an image!\n╰───────────⟡", threadID, messageID);
    }

    const waitMsg = await api.sendMessage("Uploading to FreeImage...", threadID, messageID);

    try {
      const res = await axios.get(`${API_URL}?url=${encodeURIComponent(imageUrl)}`);

      if (res.data.success === true) {
        const displayUrl = res.data.data.display_url;
        return api.editMessage(displayUrl, waitMsg.messageID);
      } else {
        throw new Error();
      }

    } catch (error) {
      return api.editMessage("✕ Failed to upload image!", waitMsg.messageID);
    }
  }
};
