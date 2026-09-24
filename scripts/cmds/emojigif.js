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
    name: "emojigif",
    version: "1.0",
    author: "Xalman",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get emoji image"
    },
    category: "FUN & SOCIAL",
    guide: {
      en: "{pn} 😊"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      const emoji = args.join(" ");

      if (!emoji)
        return message.reply("❌ | Please provide an emoji");

      const apiUrl = `${await getApiBaseUrl()}/api/emojigif?emoji=${encodeURIComponent(emoji)}`;

      const res = await axios.get(apiUrl);
      const imageUrl = res.data?.data?.image;

      if (!imageUrl)
        return message.reply("❌ | No image found");

      const filePath = path.join(
        __dirname,
        "cache",
        `emoji_${Date.now()}.webp`
      );

      const img = await axios({
        url: imageUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(filePath);
      img.data.pipe(writer);

      writer.on("finish", async () => {
        await message.reply({
          body: `Emoji: ${emoji}`,
          attachment: fs.createReadStream(filePath)
        });

        fs.unlinkSync(filePath);
      });

      writer.on("error", () => {
        message.reply("❌ | Failed to download image");
      });

    } catch (err) {
      console.error(err);
      message.reply("❌ | API Error");
    }
  }
};
