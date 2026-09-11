const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "ai-song",
    aliases: ["aisong", "aimusic"],
    version: "2.0",
    author: "xalman",
    countDown: 20,
    role: 0,

    shortDescription: "Generate AI songs",

    longDescription:
      "Generate custom AI songs using your own prompt, lyrics, genre, style and duration.",

    category: "AI-MUSIC",

    guide: {
      en: `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃     🎵 AI SONG GENERATOR
╰━━━━━━━━━━━━━━━━━━━━━━╯

📝 BASIC USAGE
━━━━━━━━━━━━━━━━━━━━━━
{pn} <prompt>

Example:
{pn} A romantic song about Bangladesh

━━━━━━━━━━━━━━━━━━━━━━
🎼 CUSTOM SONG
━━━━━━━━━━━━━━━━━━━━━━
{pn} <prompt> | <genre> | <style> | <duration>

Example:
{pn} My Bangladesh Song | Phonk | Deep 808 bass, powerful vocals | 60

━━━━━━━━━━━━━━━━━━━━━━
🎤 LYRICS EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━
{pn} [Verse 1] Hello Bangladesh
[Chorus] We love our country
[Verse 2] Beautiful green land | Pop | Emotional, melodic vocals | 90

━━━━━━━━━━━━━━━━━━━━━━
🎼 AVAILABLE GENRES
━━━━━━━━━━━━━━━━━━━━━━
• Phonk
• Lo-fi
• EDM
• Hip Hop
• Pop
• Rock
• Ambient
• Jazz
• Trap
• Drill
• R&B
• Classical
• Acoustic
• Orchestral
• Electronic
• Cinematic
• Experimental
• Custom

━━━━━━━━━━━━━━━━━━━━━━
🎨 AVAILABLE STYLES
━━━━━━━━━━━━━━━━━━━━━━
• Aggressive energy
• Deep 808 bass
• Heavy bass
• Hard bass
• Powerful vocals
• Soft vocals
• Male vocals
• Female vocals
• Confident vocals
• Chill vibe
• Fast beat
• Slow beat
• Dark atmosphere
• Emotional
• Melodic
• Energetic
• Dreamy
• Cinematic
• Epic
• Sad
• Romantic
• Happy
• Upbeat
━━━━━━━━━━━━━━━━━━━━━━
⏱️ DURATION
━━━━━━━━━━━━━━━━━━━━━━
Minimum: 6 seconds
Maximum: 120 seconds
Default: 120 seconds

Example:
{pn} Love Song | Pop | Romantic, emotional | 90

━━━━━━━━━━━━━━━━━━━━━━
💡 LYRICS TAGS
━━━━━━━━━━━━━━━━━━━━━━
[Verse 1]
[Verse 2]
[Chorus]
[Bridge]
[Outro]

⚡ Powered by Xalman AI
`
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    const input = args.join(" ").trim();

    if (!input) {
      return api.sendMessage(
        `
🎵 AI SONG GENERATOR

📝 Please provide a song prompt or lyrics.

Example:
{pn} My Bangladesh Song

Custom:
{pn} My Song | Phonk | Deep 808 bass | 60

Use:
{pn} help

⏱️ Duration: 6-120 seconds
        `,
        threadID,
        messageID
      );
    }

    if (
      input.toLowerCase() === "help" ||
      input.toLowerCase() === "-h"
    ) {
      return api.sendMessage(
        this.config.guide.en.replace(
          /\{pn\}/g,
          "ai-song"
        ),
        threadID,
        messageID
      );
    }

    const parts = input
      .split("|")
      .map(item => item.trim());

    const prompt = parts[0] || "";

    const genre = parts[1] || "Phonk";

    const style = parts[2] || "Energetic";

    let duration = parseInt(parts[3]);

    if (isNaN(duration)) {
      duration = 120;
    }

    duration = Math.max(
      6,
      Math.min(120, duration)
    );

    if (!prompt) {
      return api.sendMessage(
        "❌ Please provide a song prompt or lyrics.",
        threadID,
        messageID
      );
    }

    const cacheDir = path.join(
      __dirname,
      "cache"
    );

    await fs.ensureDir(cacheDir);

    const filePath = path.join(
      cacheDir,
      `xalman_ai_song_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.mp3`
    );

    let loadingMessage = null;

    try {
      api.setMessageReaction(
        "⏳",
        messageID,
        () => {},
        true
      );

      loadingMessage = await api.sendMessage(
        `🎵 Generating AI Song...

📝 ${prompt}
🎼 ${genre} • 🎨 ${style}
⏱️ ${duration}s

⚡ Please wait...`,
        threadID
      );

      const response = await axios.get(
        "https://xalman-apis.vercel.app/api/ai-song",
        {
          params: {
            prompt: prompt,
            genre: genre,
            style: style,
            duration: duration
          },

          responseType: "arraybuffer",

          timeout: 180000,

          maxContentLength:
            100 * 1024 * 1024,

          maxBodyLength:
            100 * 1024 * 1024
        }
      );

      const audioBuffer = Buffer.from(
        response.data
      );

      if (
        !audioBuffer ||
        audioBuffer.length < 1000
      ) {
        throw new Error(
          "Invalid or empty audio received."
        );
      }

      const contentType = String(
        response.headers["content-type"] || ""
      ).toLowerCase();

      if (
        contentType.includes(
          "application/json"
        ) ||
        contentType.includes(
          "text/html"
        )
      ) {
        throw new Error(
          "API returned an invalid response."
        );
      }

      await fs.writeFile(
        filePath,
        audioBuffer
      );

      if (
        loadingMessage &&
        loadingMessage.messageID
      ) {
        try {
          await api.unsendMessage(
            loadingMessage.messageID
          );
        } catch {}
      }

      api.setMessageReaction(
        "🎧",
        messageID,
        () => {},
        true
      );

      return api.sendMessage(
        {
          body: `🎵 AI Song Generated
📝 ${prompt}
🎼 ${genre} • 🎨 ${style} • ⏱️ ${duration}s`,

          attachment:
            fs.createReadStream(filePath)
        },

        threadID,

        async error => {
          try {
            if (
              await fs.pathExists(filePath)
            ) {
              await fs.remove(
                filePath
              );
            }
          } catch {}

          if (error) {
            console.error(
              "Audio send error:",
              error
            );

            api.setMessageReaction(
              "❌",
              messageID,
              () => {},
              true
            );
          }
        },

        messageID
      );

    } catch (error) {
      console.error(
        "AI Song Error:",
        error?.response?.data ||
        error
      );

      api.setMessageReaction(
        "❌",
        messageID,
        () => {},
        true
      );

      if (
        loadingMessage &&
        loadingMessage.messageID
      ) {
        try {
          await api.unsendMessage(
            loadingMessage.messageID
          );
        } catch {}
      }

      try {
        if (
          await fs.pathExists(filePath)
        ) {
          await fs.remove(
            filePath
          );
        }
      } catch {}

      return api.sendMessage(
        `❌ AI Song Generation Failed

⚠️ ${
          error.message ||
          "Unknown API error"
        }

Please try again.`,
        threadID,
        messageID
      );
    }
  }
};
