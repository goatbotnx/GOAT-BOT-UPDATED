module.exports = {
  config: {
    name: "hentai",
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Random hentai image",
    longDescription: "Get hentai image from API",
    category: "NSFW",
    guide: "{pn}"
  },

  onStart: async function ({ message }) {
    try {
      const url = "https://xalman-apis.vercel.app/api/hentai";

      const stream = await global.utils.getStreamFromURL(url);

      await message.reply({
        body: "✨ 𝗛𝗲𝗿𝗲'𝘀 𝘆𝗼𝘂𝗿 𝗶𝗺𝗮𝗴𝗲 ✨\n\n🖼️ Enjoy the view!",
        attachment: stream
      });

    } catch (err) {
      console.error(err);
      message.reply("❌ | Failed to fetch image");
    }
  }
};
