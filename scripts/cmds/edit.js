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
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "edit",
    aliases: ["imageedit", "ai-edit"],
    version: "4.1",
    author: "xalman",
    countDown: 10,
    role: 0,
    shortDescription: "AI Image Editor",
    longDescription: "Edit any image using AI by replying to it with a specific prompt.",
    category: "AI & IMAGE GENERATION",
    guide: "{pn} [reply to image] [prompt]"
  },

  onStart: async function ({ event, message, args, api }) {
    const { messageReply, type, messageID, threadID } = event;

    if (
      type !== "message_reply" ||
      !messageReply.attachments ||
      messageReply.attachments.length === 0 ||
      messageReply.attachments[0].type !== "photo"
    ) {
      return api.sendMessage("⚠️ | Please reply to an image to start editing.", threadID, messageID);
    }

    const prompt = args.join(" ");
    if (!prompt) {
      return api.sendMessage("📝 | Please provide a prompt for editing.\nExample: {pn} change background to space", threadID, messageID);
    }

    const imageUrl = encodeURIComponent(messageReply.attachments[0].url);
    const cacheDir = path.join(__dirname, "cache");
    const filePath = path.join(cacheDir, `edited_image_${Date.now()}.png`);

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    api.setMessageReaction("🎨", messageID, (err) => {}, true);
    const processingMsg = await api.sendMessage("🚀 | Processing your image, please wait...", threadID);

    try {
      const API_URL = `${await getApiBaseUrl()}/api/edit?img=${imageUrl}&prompt=${encodeURIComponent(prompt)}`;

      const response = await axios({
        method: 'GET',
        url: API_URL,
        responseType: 'arraybuffer',
        timeout: 240000 
      });

      const buffer = Buffer.from(response.data, "utf-8");
      await fs.writeFile(filePath, buffer);

      api.setMessageReaction("✅", messageID, (err) => {}, true);
      await api.unsendMessage(processingMsg.messageID);

      await api.sendMessage({
        body: "✨ 𝗜𝗠𝗔𝗚𝗘 𝗘𝗗𝗜𝗧𝗘𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬 ✨\n━━━━━━━━━━━━━━━━━━━\nPrompt: " + prompt,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (err) {
      api.setMessageReaction("❌", messageID, (err) => {}, true);
      if (processingMsg.messageID) await api.unsendMessage(processingMsg.messageID);
      
      const errorMsg = err.code === "ECONNABORTED" 
        ? "⏱️ | Request Timeout: Server took more than 2 minutes." 
        : "🚫 | API Error: Could not edit image.";

      api.sendMessage(errorMsg, threadID, messageID);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
};
