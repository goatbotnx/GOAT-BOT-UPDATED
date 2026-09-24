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
    name: "islamicquiz",
    aliases: ["iquiz", "iqz"],
    version: "6.1",
    author: "xalman",
    countDown: 5,
    role: 0,
    description: "Play Islamic quiz with rewards",
    category: "GAMES",
    guide: "{pn} | {pn} list"
  },

  onStart: async function ({ event, message, args, api }) {
    const { senderID } = event;
    const BASE_URL = `${await getApiBaseUrl()}/api/iquiz`;

    if (args[0] === "list" || args[0] === "total") {
      try {
        const res = await axios.get(BASE_URL);
        return message.reply(
`RMISLAMIC QUIZ
━━━━━━━━━━━━━━━━━━
📚 Total Questions: ${res.data.total_questions}
👤 Author: ${res.data.author}
📡 Status: Active`
        );
      } catch (e) {
        return message.reply("❌ Failed to fetch quiz info.");
      }
    }

    try {
      const res = await axios.get(BASE_URL);
      const quiz = res.data;

      if (!quiz.status) return message.reply("❌ API Error.");

      const labels = ["🅐", "🅑", "🅒", "🅓"];
      let optionsText = "";

      quiz.options.forEach((opt, index) => {
        optionsText += `${labels[index]} ${opt}\n`;
      });

      const msgText =
`🕌 ISLAMIC QUIZ 🕌
━━━━━━━━━━━━━━━━━━
❓ ${quiz.question}

${optionsText}
━━━━━━━━━━━━━━━━━━
⏳ Time: 60 seconds
🤲 Answer correctly and earn rewards!`;

      return message.reply(msgText, (err, info) => {
        if (err) return;

        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: senderID,
          correctAnswer: quiz.answer,
          correctText: quiz.correct_text
        });

        setTimeout(() => {
          if (global.GoatBot.onReply.has(info.messageID)) {
            api.unsendMessage(info.messageID);
            global.GoatBot.onReply.delete(info.messageID);
          }
        }, 60000);
      });

    } catch (e) {
      return message.reply("❌ Server Error.");
    }
  },

  onReply: async function ({ event, Reply, message, usersData, api }) {
    const { senderID, body } = event;

    if (senderID !== Reply.author) {
      return message.reply("❌ This is not your quiz!");
    }

    let userAnswer = body.trim().toUpperCase();
    
    const mapping = {
      "🅐": "A", "🅑": "B", "🅒": "C", "🅓": "D"
    };
    if (mapping[userAnswer]) userAnswer = mapping[userAnswer];

    const validOptions = ["A", "B", "C", "D"];
    if (!validOptions.includes(userAnswer)) return;

    try {
      let resultMsg = "";

      if (userAnswer === Reply.correctAnswer) {
        const reward = 500;

        const userData = await usersData.get(senderID);
        const currentMoney = parseInt(userData.money || 0);

        await usersData.set(senderID, {
          money: currentMoney + reward
        });

        resultMsg =
`✅ MashaAllah! Correct Answer
━━━━━━━━━━━━━━━━━━
📖 ${Reply.correctText}
💰 Reward: +$${reward}`;
      } else {
        resultMsg =
`❌ Wrong Answer
━━━━━━━━━━━━━━━━━━
✔️ Correct Answer: ${Reply.correctAnswer}. ${Reply.correctText}`;
      }

      message.reply(resultMsg, (err, info) => {
        if (err) return;
        setTimeout(() => {
          api.unsendMessage(info.messageID);
          api.unsendMessage(Reply.messageID);
        }, 10000);
      });

      global.GoatBot.onReply.delete(Reply.messageID);

    } catch (e) {
      return message.reply("❌ Processing Error.");
    }
  }
};
