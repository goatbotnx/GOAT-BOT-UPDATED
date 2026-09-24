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
    name: "imgbb",
    aliases: ["ibb", "i"],
    version: "2.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Upload image/gif to ImgBB (supports multiple)",
    category: "tools",
    guide: "{pn} [reply to image/gif]"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❌ Please reply to an image or GIF.", threadID, messageID);
    }

    const attachments = messageReply.attachments.filter(
      att => att.type === "photo" || att.type === "animated_image"
    );

    if (attachments.length === 0) {
      return api.sendMessage("❌ No valid images or GIFs found in the reply.", threadID, messageID);
    }

    const mediaUrls = attachments.map(att => att.url);

    const waitMsg = await api.sendMessage(`⏳ Uploading ${mediaUrls.length} file(s)...`, threadID, messageID);

    try {
      const results = await Promise.all(
        mediaUrls.map(async (url) => {
          try {
            const res = await axios.get(
              `${await getApiBaseUrl()}/api/ibb?image=${encodeURIComponent(url)}`,
              { timeout: 15000 }
            );
            if (res.data.status) {
              return { success: true, url: res.data.data.display_url };
            } else {
              return { success: false, url: null };
            }
          } catch {
            return { success: false, url: null };
          }
        })
      );

      const successful = results.filter(r => r.success);

      if (successful.length === 0) {
        return api.editMessage("Upload failed.", waitMsg.messageID);
      }

      const links = successful.map(r => r.url).join("\n");
      return api.editMessage(links, waitMsg.messageID);

    } catch (error) {
      console.error(error);
      return api.editMessage("Upload failed.", waitMsg.messageID);
    }
  }
};
