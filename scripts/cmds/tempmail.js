const axios = require("axios");

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

module.exports = {
  config: {
    name: "tempmail",
    aliases: ["tm"],
    version: "6.5",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: "Temp-Mail (Free)",
    longDescription: "High-speed temporary email generator and inbox checker.",
    category: "tools",
    guide: {
      en: "{p}tm gen | {p}tm check <email>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const action = args[0]?.toLowerCase();
    const BASE_URL = `${await getApiBaseUrl()}/api`;

    try {
      if (!action) {
        const helpMsg = 
          "✉️ 𝗧𝗘𝗠𝗣-𝗠𝗔𝗜𝗟 \n" +
          "━━━━━━━━━━━━━━━━━━\n" +
          "➜ tm gen : Generate Mail\n" +
          "➜ tm check <email> : Check Inbox";
        return api.sendMessage(helpMsg, threadID, messageID);
      }

      if (action === "gen") {
        const waitMsg = await api.sendMessage("⏳ Processing... Creating private mailbox.", threadID);
        
        try {
          const { data } = await axios.get(`${BASE_URL}/gen`);

          if (!data.status || !data.email) {
            api.unsendMessage(waitMsg.messageID);
            return api.sendMessage("❌ API is currently busy. Try again.", threadID, messageID);
          }

          const successMsg = 
            "✅ 𝗘𝗠𝗔𝗜𝗟 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗘𝗗\n" +
            "━━━━━━━━━━━━━━━━━━\n" +
            `📧 Address: ${data.email}\n` +
            "━━━━━━━━━━━━━━━━━━\n" +
            "💡 𝗨𝘀𝗮𝗴𝗲:\n" +
            `Type: tm check ${data.email}`;

          api.unsendMessage(waitMsg.messageID);
          return api.sendMessage(successMsg, threadID, messageID);
        } catch (e) {
          api.unsendMessage(waitMsg.messageID);
          return api.sendMessage("❌ Connection failed with API server.", threadID, messageID);
        }
      }

      if (action === "check") {
        const email = args[1];
        if (!email) {
          return api.sendMessage("⚠️ Please provide an email! \nExample: tm check abc@domain.com", threadID, messageID);
        }

        const waitCheck = await api.sendMessage(`🔄 Syncing inbox: ${email}...`, threadID);

        try {
          const { data } = await axios.get(`${BASE_URL}/check?email=${encodeURIComponent(email)}`);

          if (!data.status || !data.messages || data.messages.length === 0) {
            api.unsendMessage(waitCheck.messageID);
            return api.sendMessage(`📭 Inbox empty or expired: \n${email}`, threadID, messageID);
          }

          let inboxText = `📩 𝗜𝗡𝗕𝗢𝗫: ${email}\n📬 𝗧𝗼𝘁𝗮𝗹 𝗠𝗮𝗶𝗹𝘀: ${data.total_messages}\n`;

          data.messages.forEach((msg, index) => {
            const cleanBody = (msg.body || msg.content || "No content")
              .replace(/<\/?[^>]+(>|$)/g, "")
              .replace(/&nbsp;/g, " ")
              .trim();

            inboxText += `\n[ 𝗠𝗔𝗜𝗟 #${index + 1} ]\n`;
            inboxText += `👤 From: ${msg.from?.name || "Sender Unknown"}\n`;
            inboxText += `📧 Mail: ${msg.from?.address || "N/A"}\n`;
            inboxText += `📌 Sub: ${msg.subject || "No Subject"}\n`;
            inboxText += `📝 Msg: ${cleanBody}\n`;
            inboxText += `━━━━━━━━━━━━━━━`;
          });

          api.unsendMessage(waitCheck.messageID);
          return api.sendMessage(inboxText, threadID, messageID);

        } catch (e) {
          api.unsendMessage(waitCheck.messageID);
          return api.sendMessage("❌ Error syncing inbox. Verify the email.", threadID, messageID);
        }
      }

      return api.sendMessage("⚠️ Invalid usage! Use 'tm gen' or 'tm check'.", threadID, messageID);

    } catch (err) {
      console.error("TM PRO ERROR:", err);
      return api.sendMessage("❌ System encountered an internal error.", threadID, messageID);
    }
  }
};
