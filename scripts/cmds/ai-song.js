const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const GENRES = {
  1: "Phonk",
  2: "Lo-fi",
  3: "EDM",
  4: "Hip Hop",
  5: "Pop",
  6: "Rock",
  7: "Jazz",
  8: "Trap",
  9: "R&B",
  10: "Classical",
  11: "Cinematic",
  12: "Experimental"
};

const STYLES = {
  1: "Aggressive energy",
  2: "Deep 808 bass",
  3: "Powerful vocals",
  4: "Chill vibe",
  5: "Emotional",
  6: "Epic",
  7: "Sad",
  8: "Romantic",
  9: "Happy",
  10: "Dreamy",
  11: "Energetic"
};

const DEFAULT_GENRE = "Phonk";
const DEFAULT_STYLE = "Energetic";
const DEFAULT_DURATION = 120;

module.exports = {
  config: {
    name: "ai-song",
    aliases: ["aisong", "aimusic"],
    version: "3.0",
    author: "xalman",
    countDown: 20,
    role: 0,
    shortDescription: "Generate AI songs",
    longDescription: "Generate custom AI songs using prompt, genre, style and duration.",
    category: "AI-MUSIC",

    guide: {
      en: `
╭━━━〔 🎵 AI SONG GENERATOR 〕━━━╮

📝 𝗕𝗮𝘀𝗶𝗰:
{pn} <prompt>
› {pn} A romantic song about Bangladesh

🎛️ 𝗔𝗱𝘃𝗮𝗻𝗰𝗲𝗱:
{pn} <prompt> --g <1-12> --s <1-11> --d <6-120>
› {pn} My Song --g 1 --s 2 --d 60

🎼 𝗚𝗲𝗻𝗿𝗲 𝗜𝗗𝘀:
 1. Phonk         7. Jazz
 2. Lo-fi         8. Trap
 3. EDM           9. R&B
 4. Hip Hop      10. Classical
 5. Pop          11. Cinematic
 6. Rock         12. Experimental

🎨 𝗦𝘁𝘆𝗹𝗲 𝗜𝗗𝘀:
 1. Aggressive energy    7. Sad
 2. Deep 808 bass        8. Romantic
 3. Powerful vocals      9. Happy
 4. Chill vibe          10. Dreamy
 5. Emotional           11. Energetic
 6. Epic

⏱️ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: 6 – 120s (Default: 120)

💡 Missing any flag → default is used.

╰━━━〔 ⚡ Powered by NX AI 〕━━━╯
`
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const input = args.join(" ").trim();

    if (!input) {
      return api.sendMessage(
        `🎵 𝗔𝗜 𝗦𝗢𝗡𝗚 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥

📝 Please provide a song prompt.

› Basic:  {pn} My Bangladesh Song
› Custom: {pn} My Song --g 1 --s 2 --d 60

Type {pn} help for full guide.`,
        threadID,
        messageID
      );
    }

    if (input.toLowerCase() === "help" || input.toLowerCase() === "-h") {
      return api.sendMessage(
        this.config.guide.en.replace(/\{pn\}/g, "ai-song"),
        threadID,
        messageID
      );
    }


    let genre = DEFAULT_GENRE;
    let style = DEFAULT_STYLE;
    let duration = DEFAULT_DURATION;

    const gMatch = input.match(/--g\s+(\d+)/i);
    const sMatch = input.match(/--s\s+(\d+)/i);
    const dMatch = input.match(/--d\s+(\d+)/i);

    if (gMatch) {
      const id = parseInt(gMatch[1]);
      if (GENRES[id]) genre = GENRES[id];
    }

    if (sMatch) {
      const id = parseInt(sMatch[1]);
      if (STYLES[id]) style = STYLES[id];
    }

    if (dMatch) {
      const d = parseInt(dMatch[1]);
      if (!isNaN(d)) duration = Math.max(6, Math.min(120, d));
    }

    const prompt = input
      .replace(/--g\s+\d+/i, "")
      .replace(/--s\s+\d+/i, "")
      .replace(/--d\s+\d+/i, "")
      .trim();

    if (!prompt) {
      return api.sendMessage("❌ Please provide a song prompt.", threadID, messageID);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const filePath = path.join(
      cacheDir,
      `xalman_ai_song_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
    );

    let loadingMessage = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      loadingMessage = await api.sendMessage(
        `🎵 Generating AI Song...\n\n📝 ${prompt}\n🎼 ${genre} • 🎨 ${style}\n⏱️ ${duration}s\n\n⚡ Please wait...`,
        threadID
      );

      const response = await axios.get(
        "https://xalman-apis.vercel.app/api/ai-song",
        {
          params: { prompt, genre, style, duration },
          responseType: "arraybuffer",
          timeout: 180000,
          maxContentLength: 100 * 1024 * 1024,
          maxBodyLength: 100 * 1024 * 1024
        }
      );

      const audioBuffer = Buffer.from(response.data);

      if (!audioBuffer || audioBuffer.length < 1000) {
        throw new Error("Invalid or empty audio received.");
      }

      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        throw new Error("API returned an invalid response.");
      }

      await fs.writeFile(filePath, audioBuffer);

      if (loadingMessage?.messageID) {
        try { await api.unsendMessage(loadingMessage.messageID); } catch {}
      }

      api.setMessageReaction("🎧", messageID, () => {}, true);

      return api.sendMessage(
        {
          body: `🎵 AI Song Generated\n📝 ${prompt}\n🎼 ${genre} • 🎨 ${style} • ⏱️ ${duration}s`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        async error => {
          try {
            if (await fs.pathExists(filePath)) await fs.remove(filePath);
          } catch {}

          if (error) {
            console.error("Audio send error:", error);
            api.setMessageReaction("❌", messageID, () => {}, true);
          }
        },
        messageID
      );

    } catch (error) {
      console.error("AI Song Error:", error?.response?.data || error);

      api.setMessageReaction("❌", messageID, () => {}, true);

      if (loadingMessage?.messageID) {
        try { await api.unsendMessage(loadingMessage.messageID); } catch {}
      }

      try {
        if (await fs.pathExists(filePath)) await fs.remove(filePath);
      } catch {}

      return api.sendMessage(
        `❌ AI Song Generation Failed\n\n⚠️ ${error.message || "Unknown API error"}\n\nPlease try again.`,
        threadID,
        messageID
      );
    }
  }
};
