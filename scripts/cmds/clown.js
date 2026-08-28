const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const Jimp = require("jimp");

module.exports = {
  config: {
    name: "clown",
    version: "1.3",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Turn someone into a clown 🤡" },
    longDescription: { en: "Overlay user's profile picture on a clown image" },
    category: "FUN & SOCIAL",
    guide: { en: "{pn} @mention/reply/uid - Generate clown image" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;

    let targetID;
    if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args.length > 0 && !isNaN(args[0])) {
      targetID = args[0];
    } else {
      targetID = senderID;
    }

    try {
      const userInfo = await api.getUserInfo(targetID);
      const name = userInfo[targetID]?.name || "Unknown";

      api.setMessageReaction("⏳", messageID, () => {}, true);

      const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const templateUrl = "https://i.imgur.com/v8hgsSH.jpeg";

      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      const [avatarBuf, templateBuf] = await Promise.all([
        axios.get(avatarUrl, {
          responseType: "arraybuffer",
          headers: { "User-Agent": userAgent }
        }),
        axios.get(templateUrl, {
          responseType: "arraybuffer",
          headers: { "User-Agent": userAgent }
        })
      ]);

      const template = await Jimp.read(templateBuf.data);
      const avatar = await Jimp.read(avatarBuf.data);

      const size = 100;
      const x = 120;
      const y = 120;

      avatar.resize(size, size);

      const mask = new Jimp(size, size, 0x00000000);
      const radius = size / 2;
      const center = size / 2;
      for (let px = 0; px < size; px++) {
        for (let py = 0; py < size; py++) {
          const dist = Math.sqrt((px - center) ** 2 + (py - center) ** 2);
          if (dist <= radius) {
            mask.setPixelColor(0xFFFFFFFF, px, py);
          }
        }
      }
      avatar.mask(mask);

      template.composite(avatar, x, y);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const filePath = path.join(cacheDir, `clown_${Date.now()}.png`);
      await template.writeAsync(filePath);

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `🤡 ${name} তোর আসল চেহারা 🤡 তুই তো একটা ক্লাউন `;

      return api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (err) {
      console.error("Clown command error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ error");
    }
  }
};
