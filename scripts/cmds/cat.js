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
        name: "cat",
        aliases: ["catimg"],
        version: "1.2.0",
        author: "xalman",
        countDown: 5,
        role: 0,
        shortDescription: "Get random cat images or check list count",
        category: "ANIME & MEDIA",
        guide: "{pn} or {pn} list"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const BASE_URL = `${await getApiBaseUrl()}/api/cat`; 

        if (args[0] === "list" || args[0] === "total") {
            try {
                const info = await axios.get(`${BASE_URL}?list=true`);
                return api.sendMessage(
                    `🐾 𝗖𝗔𝗧 𝗗𝗔𝗧𝗔𝗕𝗔𝗦𝗘 𝗜𝗡𝗙𝗢\n━━━━━━━━━━━━━━━━━━\n` +
                    `Total Images: ${info.data.total_images}\n` +
                    `Status: Active`, 
                    threadID, messageID
                );
            } catch (e) {
                return api.sendMessage("✕ Could not fetch the cat image list.", threadID, messageID);
            }
        }

        api.setMessageReaction("🐱", messageID, () => {}, true);

        try {
            const res = await axios.get(BASE_URL);
            const imageUrl = res.data.url;

            const imageStream = await axios.get(imageUrl, { 
                responseType: 'stream' 
            });

            api.setMessageReaction("✅", messageID, () => {}, true);
            
            return api.sendMessage({
                body: "❖ 𝗖𝗨𝗧𝗘 𝗖𝗔𝗧 ❖\n━━━━━━━━━━━━━━━━━━",
                attachment: imageStream.data
            }, threadID, messageID);

        } catch (error) {
            console.error(error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("✕ Failed to load the cat image!", threadID, messageID);
        }
    }
};
