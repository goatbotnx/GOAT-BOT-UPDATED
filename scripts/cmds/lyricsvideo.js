const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "lyricsvideo",
    aliases: ["lyricsvid", "lvid"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Get a lyrics video from TikTok" },
    longDescription: { en: "Search for a song and get a lyrics video from TikTok" },
    category: "MEDIA",
    guide: { en: "{pn} <query> \nExample: /lyricsvideo Happy Nation" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) {
      return message.reply("❌ Please provide a song name.\nExample: /lyricsvideo Happy Nation");
    }

    api.setMessageReaction("🎵", messageID, () => {}, true);

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    try {
      const searchUrl = `https://xalman-apis.vercel.app/api/tik?q=${encodeURIComponent(query + " lyrics video")}`;
      const searchRes = await axios.get(searchUrl, { timeout: 15000 });

      if (!searchRes.data.results || searchRes.data.results.length === 0) {
        throw new Error("No results found");
      }

      const results = searchRes.data.results;

      let selectedVideo = null;
      for (const video of results) {
        const title = (video.title || "").toLowerCase();
        if  (title.includes("লিরিক্স") || (title.includes("lyricsvideo") || (title.includes("lyrics") || title.includes("#lyrics")) {
          selectedVideo = video;
          break;
        }
      }
        
      if (!selectedVideo) {
        selectedVideo = results[Math.floor(Math.random() * results.length)];
      }

      const videoUrl = selectedVideo.video_url;

      const filePath = path.join(cacheDir, `${Date.now()}.mp4`);
      const videoRes = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 60000
      });

      fs.writeFileSync(filePath, Buffer.from(videoRes.data));

      api.setMessageReaction("✅", messageID, () => {}, true);

      const msg = `✦ 𝗟𝗬𝗥𝗜𝗖𝗦 𝗩𝗜𝗗𝗘𝗢 ✦\n━━━━━━━━━━━━━━━━━━\n♫ 𝗘𝗻𝗷𝗼𝘆 𝘆𝗼𝘂𝗿 𝘀𝗼𝗻𝗴 ♫`;

      return api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (err) {
      console.error("Lyrics video error:", err);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ Failed to get video: ${err.message || "Unknown error"}`);
    }
  }
};
