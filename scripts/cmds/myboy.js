const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_CONFIG_URL = "https://raw.githubusercontent.com/goatbotnx/xalmanx210/refs/heads/main/apis.json";
const API_KEY = "xalman-canvas";
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

const CAPTIONS = [
  "💞 𝗧𝘄𝗼 𝗵𝗲𝗮𝗿𝘁𝘀, 𝗼𝗻𝗲 𝘀𝘁𝗼𝗿𝘆.\n🫶 𝙁𝙤𝙧𝙚𝙫𝙚𝙧 𝙨𝙩𝙖𝙧𝙩𝙨 𝙝𝙚𝙧𝙚.",
  "🌹 𝗬𝗼𝘂 + 𝗠𝗲 = 𝗨𝘀.\n✨ 𝗘𝘃𝗲𝗿𝘆 𝗹𝗼𝘃𝗲 𝘀𝘁𝗼𝗿𝘆 𝗶𝘀 𝗯𝗲𝗮𝘂𝘁𝗶𝗳𝘂𝗹, 𝗼𝘂𝗿𝘀 𝗶𝘀 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲.",
  "💫 𝗦𝗼𝗺𝗲 𝗽𝗲𝗼𝗽𝗹𝗲 𝗮𝗿𝗲 𝗺𝗮𝗱𝗲 𝗳𝗼𝗿 𝗲𝗮𝗰𝗵 𝗼𝘁𝗵𝗲𝗿.\n🩵 𝗬𝗼𝘂 𝗮𝗿𝗲 𝗺𝘆 𝗽𝗲𝗿𝘀𝗼𝗻.",
  "🌙 𝗜𝗻 𝗮 𝘄𝗼𝗿𝗹𝗱 𝗳𝘂𝗹𝗹 𝗼𝗳 𝘁𝗲𝗺𝗽𝗼𝗿𝗮𝗿𝘆, 𝗯𝗲 𝗺𝘆 𝗳𝗼𝗿𝗲𝘃𝗲𝗿.\n💐 𝗬𝗼𝘂 𝗮𝗻𝗱 𝗺𝗲, 𝗮𝗹𝘄𝗮𝘆𝘀.",
  "💖 𝗟𝗼𝘃𝗲 𝗶𝘀𝗻'𝘁 𝗮𝗯𝗼𝘂𝘁 𝗳𝗶𝗻𝗱𝗶𝗻𝗴 𝘁𝗵𝗲 𝗽𝗲𝗿𝗳𝗲𝗰𝘁 𝗽𝗲𝗿𝘀𝗼𝗻,\n🫂 𝗶𝘁'𝘀 𝗮𝗯𝗼𝘂𝘁 𝗯𝘂𝗶𝗹𝗱𝗶𝗻𝗴 𝗮 𝗽𝗲𝗿𝗳𝗲𝗰𝘁 𝗯𝗼𝗻𝗱.",
  "🌸 𝗬𝗼𝘂𝗿 𝘀𝗺𝗶𝗹𝗲 𝗶𝘀 𝗺𝘆 𝗳𝗮𝘃𝗼𝘂𝗿𝗶𝘁𝗲 𝘀𝗶𝗴𝗵𝘁,\n💕 𝗬𝗼𝘂𝗿 𝗵𝗮𝗽𝗽𝗶𝗻𝗲𝘀𝘀 𝗶𝘀 𝗺𝘆 𝗴𝗿𝗲𝗮𝘁𝗲𝘀𝘁 𝗷𝗼𝘆.",
  "💍 𝗡𝗼𝘁 𝗷𝘂𝘀𝘁 𝗮 𝗽𝗶𝗰𝘁𝘂𝗿𝗲, 𝗯𝘂𝘁 𝗮 𝗽𝗿𝗼𝗺𝗶𝘀𝗲.\n🌹 𝗧𝗼𝗴𝗲𝘁𝗵𝗲𝗿 𝘁𝗵𝗿𝗼𝘂𝗴𝗵 𝗲𝘃𝗲𝗿𝘆𝘁𝗵𝗶𝗻𝗴.",
  "🦋 𝗜𝗻 𝘆𝗼𝘂𝗿 𝗲𝘆𝗲𝘀, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝗵𝗼𝗺𝗲.\n💗 𝗜𝗻 𝘆𝗼𝘂𝗿 𝗵𝗲𝗮𝗿𝘁, 𝗜 𝗳𝗼𝘂𝗻𝗱 𝗺𝘆 𝗳𝗼𝗿𝗲𝘃𝗲𝗿."
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

module.exports = {
  config: {
    name: "myboy",
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Couple canvas - myboy",
    longDescription: "Left avatar = sender, right avatar = mentioned/replied/UID user",
    category: "LOVE",
    guide: { en: "{pn} @user | reply | {pn} <uid>" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, messageReply, senderID } = event;

    let id1 = senderID;
    let id2 = null;

    const mIDs = Object.keys(mentions || {}).filter(id => id !== senderID);
    if (mIDs.length > 0) id2 = mIDs[0];
    else if (messageReply && messageReply.senderID) id2 = messageReply.senderID;
    else {
      const uidArg = args.find(a => /^\d{6,}$/.test(a));
      if (uidArg) id2 = uidArg;
    }

    if (!id2) {
      return api.sendMessage(
        "⚠️ Please mention, reply to, or provide the UID of the other user.\n" +
        "Example: myboy @user  |  reply with myboy  |  myboy 61596383823942",
        threadID, messageID
      );
    }

    let outPath = null;

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);

      const base = await getApiBaseUrl();
      const url = `${base}/api/myboy?id1=${encodeURIComponent(id1)}&id2=${encodeURIComponent(id2)}`;

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const contentType = response.headers["content-type"] || "";

      if (!contentType.includes("image")) {
        let errMsg = "Failed to generate image.";
        try {
          const json = JSON.parse(Buffer.from(response.data).toString());
          if (json.message) errMsg = json.message;
        } catch {}
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(errMsg, threadID, messageID);
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      outPath = path.join(cacheDir, `myboy_${Date.now()}.png`);
      await fs.writeFile(outPath, Buffer.from(response.data));

      api.setMessageReaction("💖", messageID, () => {}, true);

      return api.sendMessage({
        body: pick(CAPTIONS),
        attachment: fs.createReadStream(outPath)
      }, threadID, async () => {
        if (outPath && fs.existsSync(outPath)) await fs.unlink(outPath);
      }, messageID);

    } catch (err) {
      console.error(err);
      if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Image error: " + err.message, threadID, messageID);
    }
  }
};
