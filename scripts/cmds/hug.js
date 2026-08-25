const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
    config: {
        name: "hug",
        version: "2.0",
        author: "xalman",
        countDown: 5,
        role: 0,
        shortDescription: "Send a warm hug!",
        longDescription: "Hug someone using mention, reply, or UID. Generates a custom image.",
        category: "FUN & SOCIAL",
        guide: "{pn} @mention | [reply] {pn} | {pn} uid"
    },

    onStart: async function ({ api, event, args, usersData }) {
        const { threadID, messageID, senderID, mentions, type, messageReply } = event;
        
        let targetID;

        if (type === "message_reply") {
            targetID = messageReply.senderID;
        } else if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } else if (args[0] && !isNaN(args[0])) {
            targetID = args[0];
        } else {
            return api.sendMessage("Oops! You forgot to mention someone. Please mention, reply, or provide a UID to send a hug! 🤗", threadID, messageID);
        }

        try {
            api.sendMessage("Sending a warm hug... Please wait! 🫂✨", threadID, messageID);

            const senderInfo = await usersData.get(senderID);
            const targetInfo = await usersData.get(targetID);

            const cleanName = (name) => {
                if (!name) return "Someone";
                return name.split(" (")[0].split(" •")[0].split(" @")[0].trim();
            };

            const senderName = cleanName(senderInfo.name);
            const targetName = cleanName(targetInfo.name);
            const senderGender = senderInfo.gender; 

            const backgroundUrl = "https://i.imgur.com/WyIZ7Zk.jpeg";
            const avatarSenderUrl = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const avatarTargetUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

            const [bgImg, avatarSender, avatarTarget] = await Promise.all([
                loadImage(backgroundUrl),
                loadImage(avatarSenderUrl),
                loadImage(avatarTargetUrl)
            ]);

            const canvas = createCanvas(bgImg.width, bgImg.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

            let senderPos, targetPos;
            if (senderGender === 2) { 
                senderPos = { x: 220, y: 140, r: 45 };
                targetPos = { x: 280, y: 200, r: 45 };
            } else {
                senderPos = { x: 280, y: 200, r: 45 };
                targetPos = { x: 220, y: 140, r: 45 };
            }

            function drawAvatar(img, pos) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, pos.x - pos.r, pos.y - pos.r, pos.r * 2, pos.r * 2);
                ctx.restore();
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2, true);
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
            }

            drawAvatar(avatarSender, senderPos);
            drawAvatar(avatarTarget, targetPos);

            const cacheDir = path.join(__dirname, 'cache');
            const cachePath = path.join(cacheDir, `hug_${senderID}_${targetID}.png`);
            
            fs.ensureDirSync(cacheDir);
            fs.writeFileSync(cachePath, canvas.toBuffer());

            const bodyMsg = `Aww! 🥺\n${senderName} just gave a big, warm hug to ${targetName}! 🫂💖\n\n"Sometimes a hug speaks volumes that words can't explain." ✨`;

            return api.sendMessage({
                body: bodyMsg,
                attachment: fs.createReadStream(cachePath)
            }, threadID, () => {
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            }, messageID);

        } catch (error) {
            console.error("Canvas/Hug Error:", error);
            return api.sendMessage("Oh no! Couldn't send the hug due to an error. 💔 Check the console.", threadID, messageID);
        }
    }
};
