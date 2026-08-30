const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "animate",
    version: "1.0",
    author: "xalman",
    countDown: 10,
    role: 0,
    shortDescription: "Animate an image using Wan-Video AI",
    longDescription: "Reply to an image with a prompt to generate an animated video",
    category: "AI & MEDIA",
    guide: "{pn} <prompt>\nExample: /animate cinematic motion\nReply to an image to animate it."
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply } = event;
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❌ Please reply to an image.", threadID, messageID);
    }

    const attachment = messageReply.attachments[0];
    if (attachment.type !== "photo" && attachment.type !== "animated_image") {
      return api.sendMessage("❌ Please reply to an image (photo).", threadID, messageID);
    }

    const prompt = args.join(" ").trim();
    if (!prompt) {
      return api.sendMessage("✨ Please enter a prompt!\nExample: /animate cinematic motion", threadID, messageID);
    }

    const imageUrl = attachment.url;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const apiUrl = `https://xalman-apis.vercel.app/api/animate?image=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;

        const response = await axios.get(apiUrl, {
          timeout: 120000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "video/*, application/json"
          },
          responseType: "arraybuffer"
        });

        const contentType = response.headers["content-type"] || "";

        if (contentType.includes("video")) {
          const ext = contentType.split("/")[1]?.split(";")[0] || "mp4";
          const filePath = path.join(cacheDir, `animate_${Date.now()}.${ext}`);
          fs.writeFileSync(filePath, Buffer.from(response.data));

          api.setMessageReaction("✅", messageID, () => {}, true);

          const msg = `🎬 𝗔𝗡𝗜𝗠𝗔𝗧𝗘𝗗 𝗩𝗜𝗗𝗘𝗢\n━━━━━━━━━━━━━━━━━━\n📝 Prompt: ${prompt}`;

          return api.sendMessage(
            {
              body: msg,
              attachment: fs.createReadStream(filePath)
            },
            threadID,
            () => {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            },
            messageID
          );
        } else {
          const textData = response.data.toString("utf8");
          try {
            const jsonData = JSON.parse(textData);
            if (jsonData.status === false) {
              throw new Error(jsonData.message || "API error");
            } else {
              throw new Error(textData.substring(0, 200) || "Invalid API response");
            }
          } catch (parseError) {
            throw new Error(textData.substring(0, 200) || "Invalid API response");
          }
        }
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
      }
    }

    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("❌ Failed to animate image.", threadID, messageID);
  }
};
