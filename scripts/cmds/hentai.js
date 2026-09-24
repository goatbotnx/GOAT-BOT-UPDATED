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
    name: "hentai",
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Random hentai image",
    longDescription: "Get hentai image from API",
    category: "ANIME & MEDIA",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    try {
      const url = `${await getApiBaseUrl()}/api/hentai`;

      const stream = await global.utils.getStreamFromURL(url);

      await message.reply({
        body: "✨ 𝗛𝗲𝗿𝗲'𝘀 𝘆𝗼𝘂𝗿 𝗶𝗺𝗮𝗴𝗲 ✨\n\n🖼️ Enjoy the view!",
        attachment: stream
      });

    } catch (err) {
      console.error(err);
      message.reply("❌ | Failed to fetch image");
    }
  }
};
