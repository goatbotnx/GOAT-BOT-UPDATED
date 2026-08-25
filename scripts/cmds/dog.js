const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
    config: {
        name: "dog",
        aliases: ["kutta"],
        version: "2.0",
        author: "xalman",
        countDown: 5,
        role: 0,
        shortDescription: "Shows two users on a custom background",
        longDescription: "Draws sender and target user avatars on a background using Reply, Mention, or UID.",
        category: "image",
        guide: "{pn} @mention | {pn} uid | [reply] {pn}"
    },

    onStart: async function ({ message, event, args }) {
        try {
            const senderID = event.senderID;
            let targetID;

            if (event.messageReply) {
                targetID = event.messageReply.senderID;
            } else if (Object.keys(event.mentions).length > 0) {
                targetID = Object.keys(event.mentions)[0];
            } else if (args[0] && !isNaN(args[0])) {
                targetID = args[0];
            } else {
                return message.reply("Please mention someone, reply to their message, or provide their UID!");
            }

            message.reply("Please wait, the masterpiece is loading... ⏳🐶");

            const bgUrl = "https://i.imgur.com/7LzQpW2.jpeg";
            const avatar1Url = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const avatar2Url = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

            const bgImage = await loadImage(bgUrl);
            const av1 = await loadImage(avatar1Url);
            const av2 = await loadImage(avatar2Url);

            const canvas = createCanvas(bgImage.width, bgImage.height);
            const ctx = canvas.getContext("2d");

            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

            const senderPos = { x: 330, y: 270, r: 60 };
            const mentionPos = { x: 115, y: 430, r: 90 };

            function drawCircleImage(img, cx, cy, r) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
                ctx.restore();
                
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
                ctx.lineWidth = 4;
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
            }

            drawCircleImage(av1, senderPos.x, senderPos.y, senderPos.r);
            drawCircleImage(av2, mentionPos.x, mentionPos.y, mentionPos.r);

            const cachePath = path.join(__dirname, "cache", `match_${senderID}_${targetID}.png`);
            
            fs.ensureDirSync(path.join(__dirname, "cache"));
            fs.writeFileSync(cachePath, canvas.toBuffer());

            await message.reply({
                body: "Boom! Caught in 4K! 📸🐶 Here is your masterpiece, try not to laugh too hard! 🤣",
                attachment: fs.createReadStream(cachePath)
            });

            fs.unlinkSync(cachePath);

        } catch (error) {
            console.error("Canvas Error:", error);
            message.reply("An error occurred while creating the image. Please check the console.");
        }
    }
};
