const nx = require("axios");
const nxForm = require("form-data");
const nxFs = require("fs-extra");
const nxPath = require("path");

module.exports = {
  config: {
    name: "catbox",
    aliases: ["cb"],
    version: "3.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Upload media to Catbox (supports multiple)",
    longDescription: "Upload image/video/audio to Catbox.moe and get direct link",
    category: "UTILITY",
    guide: { en: "Reply to a message containing media with {pn}" }
  },

  onStart: async function ({ api, event }) {
    const nx210 = event.threadID;
    const nxId = event.messageID;
    const nxReply = event.messageReply;

    if (!nxReply || !nxReply.attachments || nxReply.attachments.length === 0) {
      return api.sendMessage("❌ Please reply to an image, video, or audio file.", nx210, nxId);
    }

    const nxFiles = nxReply.attachments.filter(att =>
      ["photo", "animated_image", "video", "audio"].includes(att.type)
    );

    if (nxFiles.length === 0) {
      return api.sendMessage("❌ No valid media found in the replied message.", nx210, nxId);
    }

    api.setMessageReaction("⏳", nxId, () => {}, true);

    const nxCache = nxPath.join(__dirname, "cache");
    if (!nxFs.existsSync(nxCache)) nxFs.mkdirSync(nxCache, { recursive: true });

    try {
      const nxResults = await Promise.all(
        nxFiles.map(async (att, i) => {
          const nxExt = att.type === "photo" ? "jpg" : att.type === "video" ? "mp4" : "mp3";
          const nxFile = nxPath.join(nxCache, `nx_catbox_${Date.now()}_${i}.${nxExt}`);

          try {
            const nxGet = await nx({
              method: "GET",
              url: att.url,
              responseType: "stream",
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });

            const nxWriter = nxFs.createWriteStream(nxFile);
            nxGet.data.pipe(nxWriter);

            await new Promise((resolve, reject) => {
              nxWriter.on("finish", resolve);
              nxWriter.on("error", reject);
            });

            const nxData = new nxForm();
            nxData.append("reqtype", "fileupload");
            nxData.append("fileToUpload", nxFs.createReadStream(nxFile));

            const nxRes = await nx.post("https://catbox.moe/user/api.php", nxData, {
              headers: {
                ...nxData.getHeaders(),
                "User-Agent": "NX-Uploader/1.0 (Mozilla/5.0)"
              },
              timeout: 60000
            });

            if (nxFs.existsSync(nxFile)) nxFs.unlinkSync(nxFile);

            if (nxRes.data && nxRes.data.startsWith("https://")) {
              return { success: true, url: nxRes.data.trim() };
            }
            return { success: false };

          } catch (err) {
            if (nxFs.existsSync(nxFile)) {
              try { nxFs.unlinkSync(nxFile); } catch {}
            }
            return { success: false };
          }
        })
      );

      const nxOk = nxResults.filter(r => r.success);

      if (nxOk.length === 0) {
        api.setMessageReaction("❌", nxId, () => {}, true);
        return api.sendMessage("❌ All uploads failed. Please try again.", nx210, nxId);
      }

      api.setMessageReaction("✅", nxId, () => {}, true);

      const nxLinks = nxOk.map(r => r.url).join("\n\n");
      return api.sendMessage(nxLinks, nx210, nxId);

    } catch (err) {
      console.error("NX Catbox Error:", err);
      api.setMessageReaction("❌", nxId, () => {}, true);
      return api.sendMessage("❌ Failed to upload media to Catbox.", nx210, nxId);
    }
  }
};
