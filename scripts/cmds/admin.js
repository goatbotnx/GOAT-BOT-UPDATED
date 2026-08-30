const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "admin",
    aliases: ["operator", "dev"],
    version: "2.4",
    author: "xalman",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Operator system" },
    longDescription: { en: "Add/remove operator (only owner), list operator (everyone)" },
    category: "box chat",
    guide: {
      en: '   {pn} add <uid/@tag/reply>\n   {pn} remove <uid/@tag/reply>\n   {pn} list'
    }
  },

  langs: {
    en: {
      added: "✅ | Added operator for %1 users:\n%2",
      alreadyAdmin: "\n⚠️ | %1 users already operator:\n%2",
      missingIdAdd: "⚠️ | Please enter ID, tag, or reply to a message to add operator.",
      removed: "✅ | Removed operator of %1 users:\n%2",
      notAdmin: "⚠️ | %1 users are not operator:\n%2",
      missingIdRemove: "⚠️ | Please enter ID, tag, or reply to a message to remove operator.",
      listAdmin: "👑 | Operator list:\n%1"
    }
  },

  onStart: async function ({ message, args, usersData, event, api, getLang }) {
    const senderID = event.senderID;
    const OWNER = "61593683823942";

    let OWNER_NAME = "Unknown Owner";

    try {
      const fetchName = await usersData.getName(OWNER);
      if (fetchName && fetchName !== "Facebook User") {
        OWNER_NAME = fetchName;
      } else if (api && typeof api.getUserInfo === "function") {
        const ownerInfo = await api.getUserInfo(OWNER);
        if (ownerInfo && ownerInfo[OWNER] && ownerInfo[OWNER].name) {
          OWNER_NAME = ownerInfo[OWNER].name;
        }
      }
    } catch (e) {
      console.error("Failed to fetch owner name:", e);
    }

    switch (args[0]) {
      case "add":
      case "-a": {
        if (senderID !== OWNER)
          return message.reply("❌ | Only Owner can add operator.");

        let uids = [];
        if (event.type === "message_reply") {
          uids.push(event.messageReply.senderID);
        } else if (Object.keys(event.mentions).length > 0) {
          uids = Object.keys(event.mentions);
        } else if (args.slice(1).length > 0) {
          uids = args.slice(1).filter(arg => !isNaN(arg));
        }

        if (uids.length === 0)
          return message.reply(getLang("missingIdAdd"));

        const notAdminIds = [];
        const adminIds = [];

        for (const uid of uids) {
          if (config.adminBot.includes(uid))
            adminIds.push(uid);
          else
            notAdminIds.push(uid);
        }

        config.adminBot.push(...notAdminIds);

        const getNames = await Promise.all(
          uids.map(uid => usersData.getName(uid).then(name => ({ uid, name })))
        );

        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

        return message.reply(
          (notAdminIds.length > 0 ? getLang(
            "added",
            notAdminIds.length,
            getNames.filter(n => notAdminIds.includes(n.uid)).map(i => `• ${i.name} (${i.uid})`).join("\n")
          ) : "")
          +
          (adminIds.length > 0 ? getLang(
            "alreadyAdmin",
            adminIds.length,
            adminIds.map(uid => `• ${uid}`).join("\n")
          ) : "")
        );
      }

      case "remove":
      case "-r": {
        if (senderID !== OWNER)
          return message.reply("❌ | Only Owner can remove operator.");

        let uids = [];
        if (event.type === "message_reply") {
          uids.push(event.messageReply.senderID);
        } else if (Object.keys(event.mentions).length > 0) {
          uids = Object.keys(event.mentions);
        } else if (args.slice(1).length > 0) {
          uids = args.slice(1).filter(arg => !isNaN(arg));
        }

        if (uids.length === 0)
          return message.reply(getLang("missingIdRemove"));

        const notAdminIds = [];
        const adminIds = [];

        for (const uid of uids) {
          if (config.adminBot.includes(uid))
            adminIds.push(uid);
          else
            notAdminIds.push(uid);
        }

        for (const uid of adminIds)
          config.adminBot.splice(config.adminBot.indexOf(uid), 1);

        const getNames = await Promise.all(
          adminIds.map(uid => usersData.getName(uid).then(name => ({ uid, name })))
        );

        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

        return message.reply(
          (adminIds.length > 0 ? getLang(
            "removed",
            adminIds.length,
            getNames.map(i => `• ${i.name} (${i.uid})`).join("\n")
          ) : "")
          +
          (notAdminIds.length > 0 ? getLang(
            "notAdmin",
            notAdminIds.length,
            notAdminIds.map(uid => `• ${uid}`).join("\n")
          ) : "")
        );
      }

      case "list":
      case "-l": {
        const getNames = await Promise.all(
          config.adminBot.map(uid => usersData.getName(uid).then(name => ({ uid, name })))
        );

        const ownerBox =
`╭━━━〔 👑 OWNER 〕━━━╮
│ Name : ${OWNER_NAME}
│ UID  : ${OWNER}
╰━━━━━━━━━━━━━━━━━━━━╯`;

        const operatorsBox =
`╭━━〔 🛠 OPERATOR LIST 〕━━╮
${getNames.length > 0
  ? getNames.map(i => `│ • ${i.name} (${i.uid})`).join("\n")
  : "│ No Operators Found"}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

        return message.reply(ownerBox + "\n\n" + operatorsBox);
      }

      default:
        return message.SyntaxError();
    }
  }
};
