const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "theme",
    aliases: ["aitheme"],
    version: "5.0",
    author: "xalman",
    countDown: 5,
    role: 1,
    description: "Create and apply AI themes for group chats",
    category: "box chat",
    guide: "{pn} - Show current theme\n{pn} id - Show theme ID\n{pn} apply <themeID> - Apply theme\n{pn} <description> - Generate AI themes"
  },

  onReply: async function ({ message, Reply, event, api }) {
    const { author, themes, threadID, messageID } = Reply;
    const currentUserId = event.senderID || event.userID || (event.from && event.from.id);

    if (currentUserId !== author) {
      return message.reply('❌ Only the person who generated these themes can select one.');
    }

    const selection = parseInt((event.body || event.text || '').trim());

    if (!selection || selection < 1 || selection > themes.length) {
      return message.reply(`❌ Invalid selection. Please reply with a number between 1 and ${themes.length}.`);
    }

    const selectedTheme = themes[selection - 1];

    try {
      if (messageID && typeof api.unsendMessage === "function") {
        try { await api.unsendMessage(messageID); } catch (e) {}
      }

      const themeId = selectedTheme.id || selectedTheme.themeId || selectedTheme.theme_fbid;
      if (!themeId) {
        return message.reply('❌ Selected theme does not have a valid theme ID.');
      }

      await new Promise((resolve, reject) => {
        api.changeThreadColor(themeId, threadID, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const themeName = selectedTheme.accessibility_label || selectedTheme.name || "AI Theme";
      let successMsg = `✅ Theme applied successfully!\n📝 Name: ${themeName}\n🆔 ID: ${themeId}`;

      const attachments = [];
      const imageUrl = selectedTheme.background_asset?.image?.url || selectedTheme.backgroundImage || selectedTheme.image || selectedTheme.images?.background;

      if (imageUrl) {
        try {
          const stream = await getStreamFromURL(imageUrl);
          if (stream) attachments.push(stream);
        } catch (imgErr) {
          console.log('Failed to load theme image:', imgErr);
        }
      }

      return message.reply({
        body: successMsg,
        attachment: attachments.length > 0 ? attachments : undefined
      });

    } catch (error) {
      console.error('Theme apply error:', error);
      return message.reply(`❌ Failed to apply theme: ${error.message || error}`);
    }
  },

  onStart: async function ({ args, message, event, api, commandName }) {
    const { threadID, senderID } = event;
    const command = String(args[0] || "").toLowerCase().trim();

    if (command === "id") {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const theme = threadInfo?.threadTheme || {};
        const themeId = theme.id || theme.theme_fbid || theme.themeId || threadInfo?.color || "Unknown";
        const color = theme.accessibility_label || theme.name || threadInfo?.color || "Unknown";

        return message.reply(
          `╭──〔 THEME ID 〕──╮\n│\n│ 📌 ID: ${themeId}\n│ 🎨 Color: ${color}\n│\n╰─────────────────`
        );
      } catch (error) {
        return message.reply(`❌ Failed to get current theme.\n\n${error.message || error}`);
      }
    }

    if (command === "apply" || command === "set") {
      const themeId = args.slice(1).join(" ").trim();
      if (!themeId) {
        return message.reply("❌ Please provide a theme ID.\n\nExample: /theme apply 739785333579430");
      }

      try {
        await new Promise((resolve, reject) => {
          api.changeThreadColor(themeId, threadID, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        return message.reply(`✅ Theme applied successfully!\n📌 ID: ${themeId}`);
      } catch (error) {
        return message.reply(`❌ Failed to apply theme: ${error.message || error}`);
      }
    }

    const prompt = args.join(" ").trim();

    if (!prompt) {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const theme = threadInfo?.threadTheme;
        if (!theme) {
          return message.reply(
            `╭──〔 CURRENT THEME 〕──╮\n│\n│ ℹ️ Default theme\n│\n│ 💡 Use: /theme <description>\n│ to generate AI themes\n╰────────────────────`
          );
        }
        const themeId = theme.id || theme.theme_fbid || theme.themeId || threadInfo?.color || "Unknown";
        const color = theme.accessibility_label || theme.name || threadInfo?.color || "Unknown";

        return message.reply(
          `╭──〔 CURRENT THEME 〕──╮\n│\n│ 📌 ID: ${themeId}\n│ 🎨 Color: ${color}\n│\n│ 💡 Change: /theme apply <ID>\n│ 💡 Generate: /theme <description>\n╰────────────────────`
        );
      } catch (error) {
        return message.reply(`❌ Failed to get current theme.\n\n${error.message || error}`);
      }
    }

    if (typeof api.createThemeAI !== "function" && typeof api.metaTheme !== "function") {
      return message.reply(
        "❌ Your current FCA does not support AI theme generation.\n\nPlease update your FCA/package to a version that provides `api.createThemeAI()` or `api.metaTheme()`."
      );
    }

    try {
      await message.reply(`🎨 Generating AI themes...\n\n📝 ${prompt}`);

      let themes = [];
      
      if (typeof api.createThemeAI === "function") {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(new Promise((resolve, reject) => {
            api.createThemeAI(prompt, (err, data) => {
              if (err) reject(err);
              else resolve(data);
            });
          }));
        }
        
        const results = await Promise.allSettled(promises);
        themes = results
          .filter(r => r.status === "fulfilled")
          .map(r => r.value)
          .filter(theme => theme && (theme.id || theme.themeId || theme.theme_fbid));
        
        if (themes.length === 0) {
          return message.reply("❌ No themes were generated.\n\nTry a different description.");
        }
      } else {
        const result = await new Promise((resolve, reject) => {
          api.metaTheme(prompt, { numThemes: 5 }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        themes = normalizeThemes(result);
      }

      if (!themes || themes.length === 0) {
        return message.reply("❌ No themes were generated.\n\nTry a different description.");
      }

      let themeList = "";
      const attachments = [];

      for (let i = 0; i < themes.length; i++) {
        const theme = themes[i];
        const themeId = theme.id || theme.themeId || theme.theme_fbid || "Unknown";
        const themeName = theme.accessibility_label || theme.name || theme.label || "AI Generated";

        themeList += `${i + 1}. 📝 Name: ${themeName}\n`;
        themeList += `   🆔 ID: ${themeId}\n\n`;

        const imageUrl = theme.background_asset?.image?.url || theme.backgroundImage || theme.image || theme.images?.background;
        if (imageUrl) {
          try {
            const stream = await getStreamFromURL(imageUrl);
            if (stream) attachments.push(stream);
          } catch (err) {
            console.error(`Preview ${i + 1} failed:`, err.message);
          }
        }
      }

      const replyMessage = `╭──〔 AI THEME GENERATOR 〕──╮\n│\n│ ✨ Generated ${themes.length} theme(s)!\n│ 📝 ${prompt}\n│\n${themeList}│ 💬 Reply with a number (1-${themes.length})\n│ to apply the theme.\n╰──────────────────────────`;

      const replyData = { body: replyMessage };
      if (attachments.length > 0) replyData.attachment = attachments;

      return message.reply(replyData, (err, info) => {
        if (err || !info?.messageID) return;
        if (!global.GoatBot?.onReply?.set) return;

        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          author: senderID,
          threadID,
          themes: themes,
          createdAt: Date.now()
        });
      });

    } catch (error) {
      console.error("[THEME] Generation Error:", error);
      return message.reply(`❌ Theme generation failed.\n\nReason: ${error.message || error}`);
    }
  }
};

function normalizeThemes(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.themes && Array.isArray(result.themes)) return result.themes;
  if (result.data?.themes && Array.isArray(result.data.themes)) return result.data.themes;
  if (result.results && Array.isArray(result.results)) return result.results;
  if (result.data && Array.isArray(result.data)) return result.data;
  if (result.id || result.themeId || result.theme_fbid) return [result];
  return [];
}
