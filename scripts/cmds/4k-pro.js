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
    name: "4kpro",
    aliases: ["4k-pro", "4k2"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Upscale image to HD/4K quality" },
    category: "image",
    guide: { en: "{pn} <image url> or reply to an image" }
  },

  onStart: async function ({ message, args, event, api }) {
    let imageUrl = args[0];

    if (!imageUrl && event.messageReply?.attachments?.length > 0) {
      const attach = event.messageReply.attachments[0];
      if (attach.type === "photo") {
        imageUrl = attach.url;
      }
    }

    if (!imageUrl) {
      return message.reply("⚠️ Please provide an image URL or reply to an image with this command.");
    }

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const apiUrl = `${await getApiBaseUrl()}/api/image-upscale?image=${encodeURIComponent(imageUrl)}`;
      const response = await axios.get(apiUrl, { responseType: "stream" });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      return message.reply({
        body: "✨ Image Upscaled to 4K Quality!",
        attachment: response.data
      });

    } catch (error) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("❌ Failed to upscale image. Please try again later.");
    }
  }
};
