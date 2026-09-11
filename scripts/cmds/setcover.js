const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "setcover",
    aliases: ["changecover", "cover"],
    version: "1.0",
    author: "xalman",
    role: 2,
    countDown: 10,
    shortDescription: "Change bot's cover photo",
    longDescription: "Update the bot's Facebook cover photo by replying to an image",
    category: "owner",
    guide: "{pn} [reply to an image]"
  },

  onStart: async function ({ api, event }) {
    const { threadID, messageID, messageReply } = event;

    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❌ Please reply to an image to set as cover photo.", threadID, messageID);
    }

    const att = messageReply.attachments[0];

    if (att.type !== "photo" && att.type !== "animated_image") {
      return api.sendMessage("❌ The replied attachment is not an image.", threadID, messageID);
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const stream = await global.utils.getStreamFromURL(att.url);
      if (!stream) throw new Error("Failed to get stream from URL");

      if (typeof api.changeCover !== "function") {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
          "❌ Your current FCA does not support cover photo change (api.changeCover is missing).",
          threadID,
          messageID
        );
      }

      api.changeCover(stream, (err, result) => {
        if (err) {
          console.error("Cover change error:", err);
          api.setMessageReaction("❌", messageID, () => {}, true);
          return api.sendMessage(
            `❌ Failed to update cover photo.\nReason: ${err.message || JSON.stringify(err)}`,
            threadID,
            messageID
          );
        }

        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage("✅ 𝗕𝗼𝘁 𝗰𝗼𝘃𝗲𝗿 𝗽𝗵𝗼𝘁𝗼 𝘂𝗽𝗱𝗮𝘁𝗲𝗱 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆!", threadID, messageID);
      });

    } catch (err) {
      console.error("Setcover error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage(`❌ Error: ${err.message}`, threadID, messageID);
    }
  }
};
