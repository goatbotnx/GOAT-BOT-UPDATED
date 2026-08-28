const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "top",
    version: "6.0",
    author: "xalman",
    role: 0,
    shortDescription: { en: "Top Richest Leaderboard" },
    longDescription: { en: "Display top richest users with screenshot design." },
    category: "RANK",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ api, event, usersData, message }) {
    const allUsers = await usersData.getAll();
    const topUsers = allUsers
      .sort((a, b) => (b.money || 0) - (a.money || 0))
      .slice(0, 17);

    const width = 800;
    const height = 1800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    function drawRoundedRect(x, y, w, h, r, fillColor) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
    }

    function formatNumber(num) {
      if (!num || isNaN(num)) return "0";
      const units = [
        { v: 1e18, s: "Qi" },
        { v: 1e15, s: "Qa" },
        { v: 1e12, s: "T" },
        { v: 1e9,  s: "B" },
        { v: 1e6,  s: "M" },
        { v: 1e3,  s: "K" }
      ];
      for (const u of units) {
        if (num >= u.v) {
          return (num / u.v).toFixed(2).replace(/\.00$/, "") + u.s;
        }
      }
      return num.toString();
    }

    ctx.fillStyle = "#030617";
    ctx.fillRect(0, 0, width, height);

    const bgGlow = ctx.createRadialGradient(width / 2, 250, 50, width / 2, 250, 400);
    bgGlow.addColorStop(0, "rgba(255, 215, 0, 0.15)");
    bgGlow.addColorStop(1, "rgba(3, 6, 23, 0)");
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, 600);

    ctx.textAlign = "center";
    ctx.font = "bold 42px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "rgba(255, 215, 0, 0.6)";
    ctx.shadowBlur = 15;
    ctx.fillText("TOP BALANCE LEADERBOARD", width / 2, 80);
    ctx.shadowBlur = 0;

    const avatarCache = {};
    const token = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      try {
        const url = `https://graph.facebook.com/${user.userID}/picture?width=200&height=200&access_token=${token}`;
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const img = await loadImage(response.data);
        avatarCache[user.userID] = img;
      } catch {}
    }

    const top3Pos = [
      { rank: "#1", x: width / 2, y: 220, r: 85, color: "#FFD700", idx: 0 },
      { rank: "#2", x: 200, y: 240, r: 65, color: "#C0C0C0", idx: 1 },
      { rank: "#3", x: 600, y: 240, r: 65, color: "#E5A066", idx: 2 }
    ];

    for (const pos of top3Pos) {
      const u = topUsers[pos.idx];
      if (!u) continue;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = pos.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = pos.color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
      ctx.clip();
      if (avatarCache[u.userID]) {
        ctx.drawImage(avatarCache[u.userID], pos.x - pos.r, pos.y - pos.r, pos.r * 2, pos.r * 2);
      } else {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(pos.x - pos.r, pos.y - pos.r, pos.r * 2, pos.r * 2);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(pos.x + pos.r * 0.7, pos.y - pos.r * 0.7, 18, 0, Math.PI * 2);
      ctx.fillStyle = pos.color;
      ctx.fill();
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pos.rank, pos.x + pos.r * 0.7, pos.y - pos.r * 0.7);

      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 22px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText((u.name || "User").substring(0, 15), pos.x, pos.y + pos.r + 35);

      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#22c55e";
      ctx.fillText(`$${formatNumber(u.money)}`, pos.x, pos.y + pos.r + 65);
    }

    const startY = 480;
    const itemHeight = 65;
    const maxBarMoney = topUsers[3]?.money || 1;

    for (let i = 3; i < topUsers.length; i++) {
      const user = topUsers[i];
      const currentY = startY + (i - 3) * (itemHeight + 12);

      drawRoundedRect(40, currentY, width - 80, itemHeight, 10, "rgba(15, 23, 42, 0.75)");

      ctx.textAlign = "left";
      ctx.font = "16px Arial";
      ctx.fillStyle = "#64748b";
      ctx.fillText(`#${i + 1}`, 60, currentY + 38);

      const avX = 100;
      const avR = 20;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avR, currentY + 32, avR, 0, Math.PI * 2);
      ctx.clip();
      if (avatarCache[user.userID]) {
        ctx.drawImage(avatarCache[user.userID], avX, currentY + 12, avR * 2, avR * 2);
      } else {
        ctx.fillStyle = "#334155";
        ctx.fillRect(avX, currentY + 12, avR * 2, avR * 2);
      }
      ctx.restore();

      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#E2E8F0";
      const truncatedName = (user.name || "User").length > 14 
        ? (user.name || "User").substring(0, 14) + "..." 
        : (user.name || "User");
      ctx.fillText(truncatedName, 155, currentY + 38);

      const barX = 320;
      const barY = currentY + 26;
      const maxBarWidth = 260;
      drawRoundedRect(barX, barY, maxBarWidth, 12, 6, "rgba(255, 255, 255, 0.05)");

      const fillRatio = Math.min((user.money || 0) / maxBarMoney, 1);
      const activeWidth = Math.max(fillRatio * maxBarWidth, 12);

      const barGrad = ctx.createLinearGradient(barX, 0, barX + activeWidth, 0);
      barGrad.addColorStop(0, "#00d2ff");
      barGrad.addColorStop(1, "#00f2fe");

      ctx.shadowColor = "#00f2fe";
      ctx.shadowBlur = 8;
      drawRoundedRect(barX, barY, activeWidth, 12, 6, barGrad);
      ctx.shadowBlur = 0;

      ctx.textAlign = "right";
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#22c55e";
      ctx.fillText(`$${formatNumber(user.money)}`, width - 60, currentY + 38);
    }

    ctx.textAlign = "center";
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillText("Powered by xalman", width / 2, height - 30);

    const cachePath = path.join(__dirname, "cache");
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

    const imagePath = path.join(cachePath, `top_${Date.now()}.png`);
    fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

    return message.reply({
      body: "🏆 leaderboard ",
      attachment: fs.createReadStream(imagePath)
    }, () => {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    });
  }
};
