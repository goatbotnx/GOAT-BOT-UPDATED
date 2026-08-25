const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "rip",
    version: "2.6",
    author: "xalman+sadik",
    countDown: 5,
    role: 0,
    shortDescription: "RIP image with mention and sender avatars",
    longDescription: "Edit image with sender and mentioned user profile pictures with no text on image.",
    category: "FUN & SOCIAL",
    guide: "{pn} @mention | reply | uid"
  },

  onStart: async function ({ api, event, args }) {
    let mentionID;
    
    if (event.type === "message_reply") {
      mentionID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions).length > 0) {
      mentionID = Object.keys(event.mentions)[0];
    } else if (args.length > 0 && !isNaN(args[0])) {
      mentionID = args[0];
    } else {
      return api.sendMessage("Please mention a user, reply to a message, or provide a UID.", event.threadID, event.messageID);
    }

    const senderID = event.senderID;
    const bgUrl = "https://i.imgur.com/EgOL9Fo.jpeg";

    try {
      const bgRes = await axios.get(bgUrl, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const bgImage = await loadImage(Buffer.from(bgRes.data, "utf-8"));

      let senderName = "Someone";
      let mentionName = "Someone";
      let senderAvatarUrl = `https://graph.facebook.com/${senderID}/picture?width=512&height=512`;
      let mentionAvatarUrl = `https://graph.facebook.com/${mentionID}/picture?width=512&height=512`;

      try {
        const userInfo = await api.getUserInfo([senderID, mentionID]);
        if (userInfo[senderID]) {
          senderName = userInfo[senderID].name.split(" (")[0].split(" @")[0].trim();
          if (userInfo[senderID].thumbSrc) senderAvatarUrl = userInfo[senderID].thumbSrc;
        }
        if (userInfo[mentionID]) {
          mentionName = userInfo[mentionID].name.split(" (")[0].split(" @")[0].trim();
          if (userInfo[mentionID].thumbSrc) mentionAvatarUrl = userInfo[mentionID].thumbSrc;
        }
      } catch (e) {
        console.log("Error fetching user info:", e.message);
      }

      const getBuffer = async (url) => {
        try {
          const res = await axios.get(url, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" } });
          return Buffer.from(res.data, "utf-8");
        } catch (err) {
          const fallback = await axios.get(`https://graph.facebook.com/${senderID}/picture?width=512&height=512`, { responseType: "arraybuffer" });
          return Buffer.from(fallback.data, "utf-8");
        }
      };

      const [senderBuffer, mentionBuffer] = await Promise.all([
        getBuffer(senderAvatarUrl),
        getBuffer(mentionAvatarUrl)
      ]);

      const senderImage = await loadImage(senderBuffer);
      const mentionImage = await loadImage(mentionBuffer);

      const canvas = createCanvas(bgImage.width, bgImage.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

      const size = 90;
      const senderX = 230;
      const senderY = 180;
      const mentionX = 80;
      const mentionY = 160;

      ctx.save();
      ctx.translate(mentionX + size / 2, mentionY + size / 2);
      ctx.rotate(-3 * Math.PI / 180); 
      ctx.drawImage(mentionImage, -size / 2, -size / 2, size, size);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(senderX + size / 2, senderY + size / 2, size / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(senderImage, senderX, senderY, size, size);
      ctx.restore();

      const cacheFolder = path.join(__dirname, "cache");
      fs.ensureDirSync(cacheFolder);
      const imagePath = path.join(cacheFolder, `rip_${senderID}_${Date.now()}.png`);
      
      fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

      const bodyMsg = `R.I.P ⚰️🕊️\nশোনা যাচ্ছে ${mentionName}-এর কবরের ওপর দাঁড়িয়ে ফুল দিয়ে শোক প্রকাশ করছেন স্বয়ং ${senderName}!\n\n"সবাই একদিন চলে যাবে, কিন্তু এই স্মৃতি থেকে যাবে!" 😢🥀`;

      return api.sendMessage({
        body: bodyMsg,
        attachment: fs.createReadStream(imagePath)
      }, event.threadID, () => {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }, event.messageID);

    } catch (error) {
      console.error("FULL ERROR LOG:", error);
      return api.sendMessage(`System Error: ${error.message}`, event.threadID, event.messageID);
    }
  }
};
