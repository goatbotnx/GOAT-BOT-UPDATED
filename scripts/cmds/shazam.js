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
    name: "shazam",
    aliases: ["songid"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Identify song from audio/video" },
    longDescription: { en: "Use Shazam to identify a song from a replied audio or video file" },
    category: "ANIME & MEDIA",
    guide: { en: "{pn} [reply to any audio or video]" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage(
        "❌ Please reply to an audio or video file to identify the song.\nExample: /shazam (reply to a video/audio)",
        threadID,
        messageID
      );
    }

    const attachment = messageReply.attachments[0];
    const mediaUrl = attachment.url;

    if (!attachment.type || !["audio", "video"].includes(attachment.type)) {
      return api.sendMessage(
        "❌ Please reply to an audio or video file only.",
        threadID,
        messageID
      );
    }

    api.setMessageReaction("🎵", messageID, () => {}, true);

    try {
      const apiUrl = `${await getApiBaseUrl()}/api/shazam?url=${encodeURIComponent(mediaUrl)}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });

      if (!response.data.status || !response.data.result) {
        throw new Error("No song identified");
      }

      const result = response.data.result;
      const title = result.title || "Unknown Title";
      const artist = result.artist || "Unknown Artist";
      const album = result.album || "Unknown Album";
      const thumbnail = result.thumbnail;

      let msg = `🎵 𝗦𝗛𝗔𝗭𝗔𝗠 𝗥𝗘𝗦𝗨𝗟𝗧\n━━━━━━━━━━━━━━━━━━━━\n🎶 Title: ${title}\n👤 Artist: ${artist}\n💿 Album: ${album}\n━━━━━━━━━━━━━━━━━━━━`;

      if (thumbnail) {
        try {
          const thumbResponse = await axios.get(thumbnail, {
            responseType: "arraybuffer",
            timeout: 10000,
          });
          const cacheDir = path.join(__dirname, "cache");
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          const thumbPath = path.join(cacheDir, `shazam_${Date.now()}.jpg`);
          fs.writeFileSync(thumbPath, Buffer.from(thumbResponse.data));

          api.setMessageReaction("✅", messageID, () => {}, true);
          return api.sendMessage(
            {
              body: msg,
              attachment: fs.createReadStream(thumbPath),
            },
            threadID,
            () => {
              if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
            },
            messageID
          );
        } catch (thumbError) {
          console.error("Thumbnail download error:", thumbError);
          api.setMessageReaction("✅", messageID, () => {}, true);
          return api.sendMessage(msg, threadID, messageID);
        }
      }

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(msg, threadID, messageID);
    } catch (error) {
      console.error("Shazam error:", error);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ Failed to identify the song. Please make sure the audio/video is clear and try again.",
        threadID,
        messageID
      );
    }
  },
};
