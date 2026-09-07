const axios = require("axios");

module.exports = {
  config: {
    name: "prompt",
    aliases: ["imgprompt"],
    version: "3.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Generate prompt from image",
    longDescription: "Generate an AI prompt from a replied image",
    category: "AI & IMAGE GENERATION"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, type, messageReply } = event;

    if (
      type !== "message_reply" ||
      !messageReply?.attachments?.length
    ) {
      return api.sendMessage(
        "╭─❍\n│ 𝖯𝗅𝖾𝖺𝗌𝖾 𝗋𝖾𝗉𝗅𝗒 𝗍𝗈 𝖺𝗇 𝗂𝗆𝖺𝗀𝖾!\n╰───────────⟡",
        threadID,
        messageID
      );
    }

    const attachment = messageReply.attachments.find(
      item => item?.type === "photo" && item?.url
    );

    if (!attachment) {
      return api.sendMessage(
        "╭─❍\n│ 𝖯𝗅𝖾𝖺𝗌𝖾 𝗋𝖾𝗉𝗅𝗒 𝗍𝗈 𝖺𝗇 𝗂𝗆𝖺𝗀𝖾!\n╰───────────⟡",
        threadID,
        messageID
      );
    }

    api.setMessageReaction("🔍", messageID, () => {}, true);

    try {
      const response = await axios.get(
        "https://xalman-apis.vercel.app/api/prompt",
        {
          params: {
            url: attachment.url
          },
          timeout: 120000
        }
      );

      const data = response?.data;

      if (!data?.status || !data?.result?.prompt) {
        throw new Error(
          data?.error ||
          data?.message ||
          "Prompt not found"
        );
      }

      const prompt = String(data.result.prompt)
        .replace(/\\n/g, " ")
        .replace(/\r?\n|\r/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(
        prompt,
        threadID,
        messageID
      );

    } catch (error) {
      api.setMessageReaction("❌", messageID, () => {}, true);

      return api.sendMessage(
        "✕ Failed to analyze the image!",
        threadID,
        messageID
      );
    }
  }
};
