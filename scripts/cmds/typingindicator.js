const fs = require("fs-extra");

module.exports = {
  config: {
    name: "typingindicator",
    aliases: ["typing", "typingtoggle"],
    version: "1.0",
    author: "xalman",
    countDown: 5,
    role: 2,
    shortDescription: { en: "Toggle the global typing indicator" },
    longDescription: { en: "Turn the typing indicator on/off globally and set how long it shows (ms)" },
    category: "owner",
    guide: {
      en:
        "   {pn} on\n" +
        "   {pn} off\n" +
        "   {pn} duration <milliseconds>\n" +
        "   {pn} (no args) → show current status"
    }
  },

  langs: {
    en: {
      turnedOn: "✅ Typing indicator turned ON.",
      turnedOff: "🚫 Typing indicator turned OFF.",
      durationSet: "⏱️ Typing indicator duration set to %1 ms.",
      invalidDuration: "❌ Please provide a valid duration in milliseconds (e.g. %1 duration 1000).",
      status: "📡 𝗧𝗬𝗣𝗜𝗡𝗚 𝗜𝗡𝗗𝗜𝗖𝗔𝗧𝗢𝗥\n━━━━━━━━━━━━━━━\n• Status : %1\n• Duration : %2 ms\n\n%3"
    }
  },

  onStart: async function ({ args, message, getLang, prefix, commandName }) {
    const { config } = global.GoatBot;
    const { client } = global;

    if (!config.typingIndicator)
      config.typingIndicator = { enable: true, duration: 1000 };

    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      config.typingIndicator.enable = true;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("turnedOn"));
    }

    if (sub === "off") {
      config.typingIndicator.enable = false;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("turnedOff"));
    }

    if (sub === "duration") {
      const ms = Number(args[1]);
      if (!ms || ms <= 0)
        return message.reply(getLang("invalidDuration", `${prefix}${commandName}`));

      config.typingIndicator.duration = ms;
      fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
      return message.reply(getLang("durationSet", ms));
    }

    const enabled = config.typingIndicator.enable !== false;
    const duration = config.typingIndicator.duration || 1000;
    return message.reply(
      getLang(
        "status",
        enabled ? "ON ✅" : "OFF 🚫",
        duration,
        `${prefix}${commandName} on/off/duration <ms>`
      )
    );
  }
};
