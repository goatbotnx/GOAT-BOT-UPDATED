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
        name: "bluearchive",
        aliases: ["ba"],
        version: "1.2",
        author: "xalman",
        countDown: 5,
        role: 0,
        shortDescription: "Get random Blue Archive images or check list",
        category: "ANIME & MEDIA",
        guide: "{pn} or {pn} list"
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID } = event;
        const BASE_URL = `${await getApiBaseUrl()}/api/ba`;

        if (args[0] === "list" || args[0] === "total") {
            try {
                const info = await axios.get(`${BASE_URL}?list=true`);
                return api.sendMessage(`📊 𝗕𝗟𝗨𝗘 𝗔𝗥𝗖𝗛𝗜𝗩𝗘 \n━━━━━━━━━━━━━━━━━━\nTotal Images: ${info.data.total_images}\nAuthor: ${info.data.author}\nStatus: Active`, threadID, messageID);
            } catch (e) {
                return api.sendMessage("✕ Could not fetch the image list.", threadID, messageID);
            }
        }

        api.setMessageReaction("🎨", messageID, () => {}, true);

        try {
            const response = await axios.get(BASE_URL, { 
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            api.setMessageReaction("✅", messageID, () => {}, true);
            
            return api.sendMessage({
                body: "❖ 𝗕𝗟𝗨𝗘 𝗔𝗥𝗖𝗛𝗜𝗩𝗘 ❖\n━━━━━━━━━━━━━━━━━━",
                attachment: response.data
            }, threadID, messageID);

        } catch (error) {
            console.error(error);
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage("✕ Failed to load the image from API!", threadID, messageID);
        }
    }
};
