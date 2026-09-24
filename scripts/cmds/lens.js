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
    name: "lens",
    aliases: ["ocr"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Extract text from images (Google Lens)",
    category: "tools",
    guide: "{pn} [reply to image]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, type, messageReply } = event;
    const API_URL = `${await getApiBaseUrl()}/api/lens`;

    let imageUrl;
    if (type === "message_reply" && messageReply.attachments[0]?.type === "photo") {
      imageUrl = messageReply.attachments[0].url;
    } else {
      return api.sendMessage("╭─❍\n│ 𝖯𝗅𝖾𝖺𝗌𝖾 𝗋𝖾𝗉𝗅𝗒 𝗍𝗈 𝖺𝗇 𝗂𝗆𝖺𝗀𝖾!\n╰───────────⟡", threadID, messageID);
    }

    const lang = args[0] || "eng";
    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const res = await axios.get(`${API_URL}?url=${encodeURIComponent(imageUrl)}&lang=${lang}`);

      if (res.data.status === true) {
        const extractedText = res.data.text;
        api.setMessageReaction("✅", messageID, () => {}, true);
        
        return api.sendMessage(
          ` 𝗟𝗘𝗡𝗦 𝗢𝗖𝗥\n━━━━━━━━━━━━━━━━━━\n${extractedText}\n𝗟𝗮𝗻𝗴: ${lang.toUpperCase()}`, 
          threadID, messageID
        );
      } else {
        throw new Error("No text found");
      }

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("✕ Failed to extract text from image!", threadID, messageID);
    }
  }
};
