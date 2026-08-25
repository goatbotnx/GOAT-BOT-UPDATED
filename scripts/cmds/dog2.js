const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    config: {
        name: "dog2",
        aliases: ["kutta2"],
        version: "3.0",
        author: "xalman",
        countDown: 5,
        role: 0,
        shortDescription: { en: "Convert someone into a dog" },
        longDescription: { en: "Put user's profile picture on a dog image using canvas" },
        category: "FUN & SOCIAL",
        guide: { en: "{pn} @mention / reply / UID" }
    },

    onStart: async function ({ api, event, args }) {
        const { threadID, messageID, mentions, type, messageReply, senderID } = event;

        let targetID;
        if (type === "message_reply") {
            targetID = messageReply.senderID;
        } 
        else if (Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } 
        else if (args.length > 0 && !isNaN(args[0])) {
            targetID = args[0];
        } 
        else {
            targetID = senderID;
        }

        const cacheDir = path.join(__dirname, 'cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
        const pathImg = path.join(cacheDir, `dog_${targetID}.png`);

        try {
            const userInfo = await api.getUserInfo(targetID);
            const name = userInfo[targetID].name;

            const dogImgUrl = "https://i.ibb.co/DDMySDsS/a5f597724c71.jpg"; 
            const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

            const [dogImg, avatarImg] = await Promise.all([
                loadImage(dogImgUrl),
                loadImage(avatarUrl)
            ]);

            const canvasObj = createCanvas(dogImg.width, dogImg.height);
            const ctx = canvasObj.getContext('2d');

            ctx.drawImage(dogImg, 0, 0, canvasObj.width, canvasObj.height);
            
            const x = 290; 
            const y = 50;  
            const size = 100; 

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, x, y, size, size);
            ctx.restore();

            fs.writeFileSync(pathImg, canvasObj.toBuffer());

            return api.sendMessage({
                body: `${name}, তোর আসল রূপ 🐕`,
                attachment: fs.createReadStream(pathImg)
            }, threadID, () => {
                if (fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
            }, messageID);

        } catch (e) {
            return api.sendMessage("Error executing command ❌", threadID, messageID);
        }
    }
};
                                   
