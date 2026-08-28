const Canvas = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "rank",
		version: "5.5",
		author: "xalman",
		countDown: 3,
		role: 0,
		description: "user balance exp rank card",
		category: "RANK",
		envConfig: { deltaNext: 5 }
	},

	onStart: async function ({ event, usersData, api }) {
		const { threadID, senderID, messageID, mentions } = event;
		const deltaNext = 5;

		let targetUsers = Object.keys(mentions).length == 0 ? [senderID] : Object.keys(mentions);

		for (const userID of targetUsers) {
			try {
				const userData = await usersData.get(userID);
				const allUsers = await usersData.getAll();
				
				const exp = userData.exp || 0;
				const money = userData.money || 0;
				const name = userData.name || "User";
				
				const level = Math.floor((1 + Math.sqrt(1 + 8 * exp / deltaNext)) / 2);
				const nextLevelExp = Math.floor(((Math.pow(level + 1, 2) - (level + 1)) * deltaNext) / 2);
				const progress = ((exp / nextLevelExp) * 100).toFixed(1);

				const topExp = allUsers.sort((a, b) => b.exp - a.exp);
				const rankExp = topExp.findIndex(u => u.userID == userID) + 1;

				const topMoney = [...allUsers].sort((a, b) => b.money - a.money);
				const rankMoney = topMoney.findIndex(u => u.userID == userID) + 1;

				const formattedMoney = formatNumber(money);
				const width = 1200, height = 600;
				const canvas = Canvas.createCanvas(width, height);
				const ctx = canvas.getContext('2d');

				ctx.fillStyle = "#0d1117";
				ctx.fillRect(0, 0, width, height);

				ctx.strokeStyle = "rgba(0, 242, 255, 0.1)";
				ctx.lineWidth = 1;
				for (let i = 0; i < width; i += 50) {
					ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
				}
				for (let i = 0; i < height; i += 50) {
					ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
				}

				ctx.font = 'bold 50px Courier New';
				ctx.fillStyle = '#ff0055';
				ctx.textAlign = 'center';
				ctx.fillText('USER RANK PROFILE', width / 2, 80);

				const stats = [
					{ l: "NAME", v: name.toUpperCase() },
					{ l: "BALANCE INFO", v: `${formattedMoney} USD (Rank: #${rankMoney})` },
					{ l: "LEVEL STATUS", v: `LVL ${level} (Global Rank: #${rankExp})` },
					{ l: "EXP PROGRESS", v: `${formatNumber(exp)} / ${formatNumber(nextLevelExp)}` },
					{ l: "USER ID", v: userID }
				];

				ctx.textAlign = 'left';
				stats.forEach((item, i) => {
					const x = 400, y = 110 + i * 82;
					ctx.strokeStyle = '#00f2ff';
					ctx.lineWidth = 2;
					ctx.strokeRect(x, y, 750, 70);
					
					ctx.font = '14px Monaco'; ctx.fillStyle = '#00f2ff';
					ctx.fillText(item.l, x + 15, y + 25);
					ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#ffffff';
					ctx.fillText(item.v, x + 15, y + 55);
				});

				const avatarUrl = await usersData.getAvatarUrl(userID);
				const avatarImg = await Canvas.loadImage(avatarUrl);
				
				ctx.shadowBlur = 15; ctx.shadowColor = '#00f2ff';
				ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 5;
				ctx.strokeRect(50, 110, 310, 310);
				ctx.drawImage(avatarImg, 55, 115, 300, 300);
				ctx.shadowBlur = 0;

				const barX = 50, barY = 510, barW = 1100, barH = 35;
				const fillW = (barW * (progress > 100 ? 100 : progress)) / 100;
				ctx.fillStyle = "#1a1a1a";
				ctx.fillRect(barX, barY, barW, barH);
				const g = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
				g.addColorStop(0, '#ff0055'); g.addColorStop(1, '#00f2ff');
				ctx.fillStyle = g;
				ctx.fillRect(barX, barY, fillW, barH);

				ctx.font = 'bold 20px Courier New'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
				ctx.fillText('Powered by Xalman ', width / 2, 580);

				const cachePath = path.join(__dirname, 'cache', `${userID}_rank.png`);
				fs.ensureDirSync(path.join(__dirname, 'cache'));
				fs.writeFileSync(cachePath, canvas.toBuffer());
				
				api.sendMessage({ attachment: fs.createReadStream(cachePath) }, threadID, () => fs.unlinkSync(cachePath), messageID);
			} catch (e) { api.sendMessage(`Error: ${e.message}`, threadID); }
		}
	},

	onChat: async function ({ usersData, event }) {
		const { senderID } = event;
		let { exp } = await usersData.get(senderID);
		if (isNaN(exp) || typeof exp != "number") exp = 0;
		try {
			await usersData.set(senderID, { exp: exp + 1 });
		} catch (e) { }
	}
};

function formatNumber(num) {
    if (num < 1000) return num.toString();
    const units = [
        { v: 1e30, s: "No" }, { v: 1e27, s: "Oc" }, { v: 1e24, s: "Sp" },
        { v: 1e21, s: "Sx" }, { v: 1e18, s: "Qi" }, { v: 1e15, s: "Q" },
        { v: 1e12, s: "T" }, { v: 1e9, s: "B" }, { v: 1e6, s: "M" }, { v: 1e3, s: "K" }
    ];
    for (let i = 0; i < units.length; i++) {
        if (num >= units[i].v) {
            return (num / units[i].v).toFixed(2).replace(/\.00$/, '') + units[i].s;
        }
    }
    return num.toString();
}
