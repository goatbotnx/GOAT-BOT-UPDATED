const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-hub";
let apiBaseUrl = null;
let apiConfigRequest = null;

async function getApiBaseUrl() {
  if (apiBaseUrl) return apiBaseUrl;

  if (!apiConfigRequest) {
    apiConfigRequest = axios
      .get(API_CONFIG_URL, { timeout: 15000 })
      .then(({ data }) => {
        const baseUrl = data?.[API_KEY];

        if (typeof baseUrl !== "string" || !baseUrl.trim()) {
          throw new Error(`Missing API key in apis.json: ${API_KEY}`);
        }

        apiBaseUrl = baseUrl.replace(/\/+$/, "");
        return apiBaseUrl;
      })
      .finally(() => {
        apiConfigRequest = null;
      });
  }

  return apiConfigRequest;
}

const VALID_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

module.exports = {
  config: {
    name: "flux2max",
    aliases: ["flux2-max", "fluxai"],
    version: "1.0.0",
    author: "xalman",
    countDown: 15,
    role: 0,
    shortDescription: { en: "Generate or edit images with Flux 2 Max" },
    longDescription: { en: "Text-to-image or image-edit generation using Flux 2 Max AI" },
    category: "ai",
    guide: {
      en:
        "   {pn} <prompt> → generate image (default 1:1)\n" +
        "   {pn} <prompt> --ar <ratio> → generate with custom ratio\n" +
        "   Reply to an image + {pn} <prompt> → edit that image\n" +
        "   Ratios: 1:1, 16:9, 9:16, 4:3, 3:4"
    }
  },

  onStart: async function ({ api, event, args, message, prefix, commandName }) {
    const { threadID, messageID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    if (!args.length) {
      return message.reply(
        `🎨 𝗙𝗹𝘂𝘅 𝟮 𝗠𝗮𝘅\n━━━━━━━━━━━━━━━━━━\n📝 Usage:\n${prefix}${commandName} <prompt>\n${prefix}${commandName} <prompt> --ar <ratio>\n\nReply to an image to edit it.\nRatios: ${VALID_RATIOS.join(", ")}`
      );
    }

    const argIndex = args.findIndex(a => a.toLowerCase() === "--ar");
    let ratio = "1:1";
    let promptArgs = args;

    if (argIndex !== -1) {
      const ratioArg = args[argIndex + 1];
      if (ratioArg && VALID_RATIOS.includes(ratioArg)) ratio = ratioArg;
      promptArgs = [...args.slice(0, argIndex), ...args.slice(argIndex + 2)];
    }

    const prompt = promptArgs.join(" ").trim();
    if (!prompt) return message.reply("❌ Please provide a prompt.");

    const imageUrl = event.messageReply?.attachments?.find(a => a.type === "photo")?.url || null;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    let filePath;

    try {
      const baseUrl = await getApiBaseUrl();
      const endpoint = `${baseUrl}/api/flux2max`;

      const params = { prompt, ratio };
      if (imageUrl) params.image = imageUrl;

      const res = await axios.get(endpoint, {
        params,
        timeout: 120000,
        responseType: "arraybuffer",
        validateStatus: () => true
      });

      const contentType = res.headers["content-type"] || "";

      if (!contentType.startsWith("image/")) {
        let errMsg = "Unknown error.";
        try {
          const errData = JSON.parse(Buffer.from(res.data).toString("utf-8"));
          errMsg = errData?.message || errMsg;
        } catch {}
        api.setMessageReaction("❌", messageID, () => {}, true);
        return message.reply(`❌ ${errMsg}`);
      }

      const ext = contentType.includes("png") ? "png" : "jpg";
      filePath = path.join(cacheDir, `flux_${Date.now()}.${ext}`);
      await fs.writeFile(filePath, res.data);

      api.setMessageReaction("✅", messageID, () => {}, true);

      return message.reply({
        body:
          `🎨 𝗙𝗟𝗨𝗫 𝟮 𝗠𝗔𝗫\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📐 𝗥𝗮𝘁𝗶𝗼   : ${ratio}\n` +
          `🎭 𝗠𝗼𝗱𝗲    : ${imageUrl ? "Edit" : "Text-to-Image"}\n` +
          `━━━━━━━━━━━━━━━━━━`,
        attachment: fs.createReadStream(filePath)
      });
    } catch (err) {
      console.error("[flux] Error:", err.message);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return message.reply(`❌ Failed: ${err.message}`);
    } finally {
      if (filePath) fs.remove(filePath).catch(() => {});
    }
  }
};
