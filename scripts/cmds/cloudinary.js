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
    name: "cloudinary",
    aliases: ["cloudupload", "cloud"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Upload media to Cloudinary",
    longDescription: "Upload image/video/audio to Cloudinary and get direct link",
    category: "tools",
    guide: "{pn} [reply to image/video/audio]"
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return message.reply("❌ Please reply to an image, video, or audio file.");
    }

    const attachments = messageReply.attachments.filter(att =>
      ["photo", "animated_image", "video", "audio"].includes(att.type)
    );

    if (attachments.length === 0) {
      return message.reply("❌ No valid media found in the replied message.");
    }

    const waitMsg = await message.reply(`⏳ Uploading ${attachments.length} file(s) to Cloudinary...`);

    try {
      const results = await Promise.all(
        attachments.map(async (att) => {
          try {
            const apiUrl = `${await getApiBaseUrl()}/api/cloudupload?url=${encodeURIComponent(att.url)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (res.data.status && res.data.file && res.data.file.secure_url) {
              return {
                success: true,
                url: res.data.file.secure_url
              };
            }
            return { success: false };
          } catch (err) {
            console.error("Upload error:", err.message);
            return { success: false };
          }
        })
      );

      const successful = results.filter(r => r.success);

      if (successful.length === 0) {
        return api.editMessage("❌ All uploads failed. Please try again.", waitMsg.messageID);
      }

      const links = successful.map(r => r.url).join("\n\n");
      return api.editMessage(links, waitMsg.messageID);

    } catch (error) {
      console.error("Cloud upload error:", error);
      return api.editMessage("❌ Failed to upload. Please try again later.", waitMsg.messageID);
    }
  }
};
