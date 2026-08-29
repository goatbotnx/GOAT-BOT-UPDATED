const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "say2",
    aliases: ["tts2"],
    version: "1.1",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Text to Speech using Edge TTS" },
    longDescription: { en: "Convert text to speech using Edge TTS API" },
    category: "TTS",
    guide: { en: "{pn} <text> or reply to a message\nExample: /say2 Hello world" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, messageReply } = event;
    let text = args.join(" ");

    if (!text && messageReply && messageReply.body) {
      text = messageReply.body;
    }

    if (!text) {
      return message.reply("❌ Please provide text to speak or reply to a message.\nExample: /say2 Hello world");
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    try {
      const apiUrl = `https://xalman-apis.vercel.app/api/edgetts?text=${encodeURIComponent(text)}`;

      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        responseType: "arraybuffer"
      });

      const contentType = response.headers["content-type"] || "audio/mpeg";

      if (contentType.includes("audio") || contentType.includes("mp3") || contentType === "audio/mpeg") {
        const filePath = path.join(cacheDir, `tts_${Date.now()}.mp3`);
        fs.writeFileSync(filePath, Buffer.from(response.data));

        api.setMessageReaction("✅", messageID, () => {}, true);

        return api.sendMessage({
          body: `🔊 ${text}`,
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, messageID);
      } else {
        const textData = response.data.toString("utf8");
        throw new Error(textData.substring(0, 200) || "Invalid response from API");
      }

    } catch (err) {
      console.error("TTS Error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ Failed to generate audio. Please try again.");
    }
  }
};
