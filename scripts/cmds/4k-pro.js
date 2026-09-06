const axios = require("axios");

module.exports = {
  config: {
    name: "4kpro",
    aliases: ["4k-pro", "4k2"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Upscale image to HD/4K quality" },
    category: "image",
    guide: { en: "{pn} <image url> or reply to an image" }
  },

  onStart: async function ({ message, args, event, api }) {
    let imageUrl = args[0];

    if (!imageUrl && event.messageReply?.attachments?.length > 0) {
      const attach = event.messageReply.attachments[0];
      if (attach.type === "photo") {
        imageUrl = attach.url;
      }
    }

    if (!imageUrl) {
      return message.reply("⚠️ Please provide an image URL or reply to an image with this command.");
    }

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const apiUrl = `https://xalman-apis.vercel.app/api/image-upscale?image=${encodeURIComponent(imageUrl)}`;
      const response = await axios.get(apiUrl, { responseType: "stream" });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      return message.reply({
        body: "✨ Image Upscaled to 4K Quality!",
        attachment: response.data
      });

    } catch (error) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("❌ Failed to upscale image. Please try again later.");
    }
  }
};
