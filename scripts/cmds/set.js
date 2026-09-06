module.exports = {
  config: {
    name: "set",
    aliases: ["ap"],
    version: "3.5",
    author: "xalman",
    role: 0,
    shortDescription: { en: "Modify user money or exp" },
    longDescription: { en: "Update user economy data using UID, reply or mention" },
    category: "ECONOMY",
    guide: { en: "{pn}set <money|exp> <amount> [uid]" }
  },

  onStart: async ({ args, event, api, usersData }) => {

    const { config } = global.GoatBot;
    const OWNER = config.adminBot?.[0];
    const devUsers = config.devUsers || [];
    const permitted = (OWNER && event.senderID === OWNER) || devUsers.includes(event.senderID);
    if (!permitted) {
      return api.sendMessage("🚫 Access denied.", event.threadID, event.messageID);
    }

    const parseAmount = (input) => {
      if (!input) return NaN;

      const str = input.toLowerCase().trim();
      const match = str.match(/^([\d.]+)([kmb]?)$/);
      if (!match) return NaN;

      const num = parseFloat(match[1]);
      const unit = match[2];

      const map = { k: 1e3, m: 1e6, b: 1e9 };
      return num * (map[unit] || 1);
    };

    const type = args[0]?.toLowerCase();
    const amount = parseAmount(args[1]);

    if (!type || isNaN(amount)) {
      return api.sendMessage(
        "❌ Usage: set [money|exp] [amount]",
        event.threadID
      );
    }

    const getTarget = () => {
      if (args[2] && /^\d+$/.test(args[2])) return args[2];
      if (event.type === "message_reply") return event.messageReply.senderID;
      if (event.mentions && Object.keys(event.mentions).length)
        return Object.keys(event.mentions)[0];
      return event.senderID;
    };

    const uid = getTarget();

    if (uid === api.getCurrentUserID()) {
      return api.sendMessage("🤖 Bot data locked.", event.threadID);
    }

    const userData = await usersData.get(uid);
    if (!userData) {
      return api.sendMessage("❌ User not found.", event.threadID);
    }

    const name = await usersData.getName(uid);

    let newData = {
      money: userData.money || 0,
      exp: userData.exp || 0,
      data: userData.data || {}
    };

    if (type === "money") {
      newData.money = Math.floor(amount);
    } else if (type === "exp") {
      newData.exp = Math.floor(amount);
    } else {
      return api.sendMessage("❌ Invalid type. Use money or exp only.", event.threadID);
    }

    await usersData.set(uid, newData);

    return api.sendMessage(
      `✔ ${type.toUpperCase()} set to ${Math.floor(amount)}\n👤 ${name}`,
      event.threadID
    );
  }
};
