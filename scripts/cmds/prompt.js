const axios = require("axios");

module.exports = {
  config: {
    name: "prompt",
    aliases: ["imgprompt", "p"],
    version: "4.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Generate prompt from image",
    longDescription: "Generate an AI prompt from a replied image",
    category: "AI & IMAGE GENERATION",
    guide: "{pn} (reply to an image)"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, type, messageReply } = event;

    if (type !== "message_reply" || !messageReply?.attachments?.length) {
      return api.sendMessage(
        "❌ Please reply to an image to generate a prompt.",
        threadID,
        messageID
      );
    }

    const attachment = messageReply.attachments.find(
      item => item?.type === "photo" && item?.url
    );

    if (!attachment) {
      return api.sendMessage(
        "❌ Please reply to a valid image.",
        threadID,
        messageID
      );
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const response = await axios.get(
        "https://xalman-apis.vercel.app/api/prompt",
        {
          params: { url: attachment.url },
          timeout: 120000
        }
      );

      const data = response?.data;

      if (!data?.status || !data?.prompt) {
        throw new Error(data?.error || data?.message || "Prompt not found");
      }

      const prompt = String(data.prompt)
        .replace(/\\n/g, " ")
        .replace(/\r?\n|\r/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `🖼️ 𝗜𝗠𝗔𝗚𝗘 𝗣𝗥𝗢𝗠𝗣𝗧\n━━━━━━━━━━━━━━━━━━\n${prompt}`;

      return api.sendMessage(msg, threadID, messageID);

    } catch (error) {
      console.error("Prompt Error:", error.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(
        "❌ Failed to analyze the image. Please try again.",
        threadID,
        messageID
      );
    }
  }
};
