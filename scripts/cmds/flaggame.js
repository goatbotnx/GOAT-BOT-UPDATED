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
    name: "flaggame",
    aliases: ["flag"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    description: "Guess the country by its flag",
    category: "GAMES",
    guide: "Type {pn} to start"
  },

  onStart: async function ({ event, message }) {
    const { senderID } = event;
    const API_URL = `${await getApiBaseUrl()}/api/flaggame`;

    try {
      const res = await axios.get(API_URL);
      const data = res.data;

      if (!data.status) return message.reply("❌ API Error.");

      const labels = ["A", "B", "C", "D"];
      let optionsText = "";
      data.options.forEach((opt, index) => {
        optionsText += `${labels[index]}. ${opt}\n`;
      });

      const msgText = `🚩 *Guess the Country*\n\n${optionsText}\n⏳ Reply with A, B, C, or D`;

      return message.reply({
        body: msgText,
        attachment: await global.utils.getStreamFromURL(data.flag_image)
      }, (err, info) => {
        if (err) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: senderID,
          correctAnswer: data.correct_answer,
          options: data.options
        });
      });

    } catch (e) {
      console.error(e);
      return message.reply("❌ Server Error.");
    }
  },

  onReply: async function ({ event, Reply, message, usersData }) {
    const { senderID, body } = event;

    if (senderID !== Reply.author) return;

    const input = body.trim().toUpperCase();
    const labels = ["A", "B", "C", "D"];
    const index = labels.indexOf(input);

    if (index === -1) return;

    const selectedAnswer = Reply.options[index];

    try {
      if (selectedAnswer === Reply.correctAnswer) {
        const reward = 500;
        const userData = await usersData.get(senderID);
        const currentMoney = parseInt(userData.money || 0);
        const newMoney = currentMoney + reward;
        
        await usersData.set(senderID, { money: newMoney });
        message.reply(`✅ Correct! It's ${Reply.correctAnswer}\n💰 +$${reward}`);
      } else {
        message.reply(`❌ Wrong! The correct answer was: ${Reply.correctAnswer}`);
      }

      global.GoatBot.onReply.delete(Reply.messageID);

    } catch (e) {
      return message.reply("❌ Processing Error.");
    }
  }
};
