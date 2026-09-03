const axios = require("axios");

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "6.0",
    author: "xalman",
    countDown: 5,
    role: 0,
    description: "Play a random quiz with elegant design and automatic clean-up",
    category: "GAMES",
    guide: "{pn} | {pn} list"
  },

  onStart: async function ({ event, message, args, api }) {
    const { senderID } = event;
    const BASE_URL = "https://xalman-apis.vercel.app/api/quiz";

    if (args[0] === "list" || args[0] === "total") {
      try {
        const res = await axios.get(`${BASE_URL}?list=true`);
        const listMsg = `📊 𝗤𝗨𝗜𝗭 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦\n━━━━━━━━━━━━━━━━━━━━━━\n📝 Total Questions : ${res.data.total_questions}\n👤 Database Author : ${res.data.author}\n🟢 System Status   : Active\n━━━━━━━━━━━━━━━━━━━━━━`;
        return message.reply(listMsg);
      } catch (e) {
        return message.reply("❌ Unable to fetch quiz database information.");
      }
    }

    try {
      const res = await axios.get(BASE_URL);
      const quiz = res.data;
      if (!quiz.status) return message.reply("❌ API returned an invalid response.");

      const labels = ["A", "B", "C", "D"];
      let optionsText = "";
      quiz.options.forEach((opt, index) => {
        optionsText += `🔠 [ ${labels[index]} ] : ${opt}\n`;
      });

      const msgText = `🧠 𝗤𝗨𝗜𝗭 𝗖𝗛𝗔𝗟𝗟𝗘𝗡𝗚𝗘\n━━━━━━━━━━━━━━━━━━━━━━\n❓ 𝗤𝗨𝗘𝗦𝗧𝗜𝗢𝗡:\n${quiz.question}\n\n📝 𝗢𝗣𝗧𝗜𝗢𝗡𝗦:\n${optionsText}\n━━━━━━━━━━━━━━━━━━━━━━\n⏳ You have 60 seconds to reply with the correct letter (A, B, C, or D).\n`;

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
      return message.reply("❌ Unable to establish a connection with the quiz server.");
    }
  },

  onReply: async function ({ event, Reply, message, usersData, api }) {
    const { senderID, body } = event;

    if (senderID !== Reply.author) {
      return;
    }

    const userAnswer = body.trim().toUpperCase();
    const validOptions = ["A", "B", "C", "D"];
    if (!validOptions.includes(userAnswer)) return;

    try {
      api.unsendMessage(Reply.messageID);
      let resultMsg = "";
      if (userAnswer === Reply.correctAnswer) {
        const reward = 500;
        const userData = await usersData.get(senderID);
        const currentMoney = parseInt(userData.money || 0);
        await usersData.set(senderID, { money: currentMoney + reward });
        resultMsg = `🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧 𝗔𝗡𝗦𝗪𝗘𝗥!\n━━━━━━━━━━━━━━━━━━━━━━\n✅ You chose [ ${userAnswer} ].\n\n📖 Explanation:\n${Reply.correctText}\n\n💰 Reward: +${reward.toLocaleString()} ৳`;
      } else {
        resultMsg = `😞 𝗪𝗥𝗢𝗡𝗚 𝗔𝗡𝗦𝗪𝗘𝗥!\n━━━━━━━━━━━━━━━━━━━━━━\n❌ Your choice was [ ${userAnswer} ].\n\n📖 The correct answer is:\n[ ${Reply.correctAnswer} ] : ${Reply.correctText}`;
      }

      message.reply(resultMsg);
      global.GoatBot.onReply.delete(Reply.messageID);

    } catch (e) {
      console.error(e);
      return message.reply("❌ An unexpected error occurred while processing your answer.");
    }
  }
};
