const { loadImage, createCanvas } = require("canvas");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "hack",
    version: "2.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Generates a hacking image with profile picture" },
    longDescription: { en: "Creates a hacking-themed image with user's avatar" },
    category: "FUN & SOCIAL",
    guide: { en: "{pn} @mention/reply/uid - Generate hacking image" }
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
      const templateUrl = "https://i.ibb.co/LXNX3QRW/2b38355a3b01.jpg";

      const [avatarBuf, templateBuf] = await Promise.all([
        axios.get(avatarUrl, { responseType: "arraybuffer" }),
        axios.get(templateUrl, { responseType: "arraybuffer" })
      ]);

      const avatarImg = await loadImage(avatarBuf.data);
      const templateImg = await loadImage(templateBuf.data);

      const canvas = createCanvas(templateImg.width, templateImg.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

      const x = 150;
      const y = 280;
      const size = 180;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, x, y, size, size);
      ctx.restore();

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const filePath = path.join(cacheDir, `hack_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      const statusMsg = await api.sendMessage("💻 Initializing hack...", threadID);

      const hackSteps = [
        "> ACCESSING DATABASE...",
        "> DECRYPTING FILES...",
        "> BYPASSING FIREWALL...",
        "> SYSTEM BREACHED"
      ];

      for (const step of hackSteps) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await api.editMessage(`💻 Hacking in progress...\n\n${step}`, statusMsg.messageID);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      await api.editMessage("✅ Hack complete! Sending proof...", statusMsg.messageID);

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage({
        body: `💻 ${name} has been hacked!`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (err) {
      console.error("Hack command error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply("❌ Failed to generate hacking image.");
    }
  }
};
