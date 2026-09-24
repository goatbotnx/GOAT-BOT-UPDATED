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
    name: "nanobanana",
    aliases: ["nb"],
    version: "1.2",
    author: "xalman",
    countDown: 10,
    role: 0,
    shortDescription: "Generate images using Nano Banana AI",
    longDescription: "Generate high-quality images from text prompts using Xalman's Nano Banana API",
    category: "AI & IMAGE GENERATION",
    guide: "{pn} <prompt>"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const prompt = args.join(" ");

    if (!prompt) {
      return api.sendMessage("Please provide a prompt to generate an image.", threadID, messageID);
    }

    try {
      api.setMessageReaction("🎨", messageID, () => {}, true);
      
      const url = `${await getApiBaseUrl()}/api/nb?prompt=${encodeURIComponent(prompt)}`;
      const response = await axios.get(url, { responseType: "stream" });

      await api.sendMessage({
        body: "𝗡𝗔𝗡𝗢𝗕𝗔𝗡𝗔𝗡𝗔 𝗔𝗜 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗘𝗗 🎨",
        attachment: response.data
      }, threadID, messageID);

      return api.setMessageReaction("✅", messageID, () => {}, true);

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("Failed to generate image. Please try again later.", threadID, messageID);
    }
  }
};
