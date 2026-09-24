const axios = require('axios');

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
        name: "waifu",
        version: "3.0",
        author: "xalman",
        countDown: 5,
        role: 0,
        shortDescription: "Get random anime waifu images",
        category: "ANIME & MEDIA",
        guide: "{pn}"
    },

    onStart: async function ({ api, event }) {
        const { threadID, messageID } = event;
        api.setMessageReaction("🌸", messageID, () => {}, true);

        try {
            const res = await axios.get(`${await getApiBaseUrl()}/api/waifu`);
            const imgUrl = res.data.url;

            const stream = (await axios.get(imgUrl, { responseType: 'stream' })).data;

            api.setMessageReaction("✅", messageID, () => {}, true);
            return api.sendMessage({
                body: "❖ 𝗪𝗔𝗜𝗙𝗨 𝗜𝗠𝗔𝗚𝗘 ❖\n━━━━━━━━━━━━━━━━━━\n",
                attachment: stream
            }, threadID, messageID);

        } catch (error) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("✕ Failed to fetch anime image!", threadID, messageID);
        }
    }
};
