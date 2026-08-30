const { getStreamsFromAttachment } = global.utils;
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "notification",
    aliases: ["notify", "noti"],
    version: "4.1",
    author: "xalman",
    countDown: 100,
    role: 2,
    shortDescription: { en: "Premium notification sender" },
    longDescription: { en: "Send text/media notifications to all groups with anti-ban delay." },
    category: "owner",
    guide: { en: "{pn} <message or reply to media>" },
    envConfig: { delayPerGroup: 600 }
  },

  onStart: async function ({ message, api, event, args, envCommands, threadsData, usersData }) {
    const { delayPerGroup } = envCommands.notification;
    const { senderID } = event;

    const senderName = await usersData.getName(senderID) || "Admin";
    const now = moment().tz("Asia/Dhaka");
    const timeString = now.format("hh:mm A");
    const dateString = now.format("DD/MM/YYYY");

    const msgText = args.join(" ") || "";
    const rawAttachments = [
      ...(event.attachments || []),
      ...(event.messageReply?.attachments || [])
    ].filter(item => ["photo", "animated_image", "video", "audio", "sticker"].includes(item.type));

    if (!msgText && rawAttachments.length === 0)
      return message.reply("⚠️ Please provide a message or attach media.");

    if (rawAttachments.length > 0) {
      try {
        await getStreamsFromAttachment(rawAttachments);
      } catch (err) {
        return message.reply("❌ Media Processing Failed: Check if the file is too large.");
      }
    }

    const owner = "xalman";
    const bodyText = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃    📢 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡                      
╰━━━━━━━━━━━━━━━━━━━━━━╯

👤 𝗔𝗱𝗺𝗶𝗻: ${senderName}
🕒 𝗧𝗶𝗺𝗲: ${timeString} | ${dateString}

📝 𝗠𝗲𝘀𝘀𝗮𝗴𝗲:
───────────────────
${msgText || "(Media Attachment)"}
───────────────────`;

    const botID = api.getCurrentUserID();
    const allThreads = (await threadsData.getAll()).filter(
      t => t.isGroup && t.members.some(m => m.userID == botID && m.inGroup)
    );

    const total = allThreads.length;
    if (total === 0)
      return message.reply("⚠️ No groups found to send notification.");

    let sent = 0, failed = 0;

    await message.reply(`🚀 Sending notification to ${total} groups...`);

    for (const thread of allThreads) {
      try {
        const streamAttachments = rawAttachments.length > 0
          ? await getStreamsFromAttachment(rawAttachments)
          : null;

        const formSend = { body: bodyText };
        if (streamAttachments && streamAttachments.length > 0)
          formSend.attachment = streamAttachments;

        await api.sendMessage(formSend, thread.threadID);
        sent++;
      } catch (e) {
        failed++;
        console.error(`Error in ${thread.threadID}:`, e);
      }

      const finalDelay = rawAttachments.length > 0 ? 1500 : delayPerGroup;
      await new Promise(res => setTimeout(res, finalDelay));
    }

    const finalReport = `✅ 𝗡𝗼𝘁𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱!
━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Total: ${total}
🟢 Sent: ${sent}
🔴 Failed: ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━
✨ All groups have been processed.`;

    return message.reply(finalReport);
  }
};
