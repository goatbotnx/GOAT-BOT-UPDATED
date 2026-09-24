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
    name: "4k",
    aliases: ["upscale"],
    version: "3.1",
    author: "xalman",
    countDown: 15,
    role: 0,
    shortDescription: "AI Image Upscaler",
    longDescription: "Reply to any image using the command and get 4k results",
    category: "tools",
    guide: "{pn} reply to an image"
  },

  onStart: async function ({ event, message }) {
    const { messageReply, type } = event;

    if (
      type !== "message_reply" ||
      !messageReply.attachments ||
      messageReply.attachments[0].type !== "photo"
    ) {
      return message.reply("⚠️ Please reply to an image to upscale it to 4K.");
    }

    const imageUrl = messageReply.attachments[0].url;
    const cacheDir = path.join(__dirname, "cache");
    const filePath = path.join(cacheDir, `upscale_${Date.now()}.png`);

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    await message.reply("⏳ Processing your image to .. This may take a moment.");

    try {
      const UPSCALE_API = `${await getApiBaseUrl()}/api/upscale`;

      const res = await axios.post(
        UPSCALE_API,
        { imageUrl: imageUrl },
        {
          responseType: "arraybuffer",
          timeout: 300000
        }
      );

      await fs.writeFile(filePath, Buffer.from(res.data));

      await message.reply({
        body: "✅ нєяє ιѕ уσυя 4к вву 🥀",
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 5000);

    } catch (err) {
      console.error("UPSCALE ERROR:", err);

      let errorMsg = "❌ Upscale service is currently unavailable.";
      if (err.code === "ECONNABORTED") {
        errorMsg = "❌ Server timeout: The image processing took too long.";
      } else if (err.response) {
        errorMsg = `❌ API Error: ${err.response.status} - ${err.response.statusText}`;
      }

      message.reply(errorMsg);

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
};
