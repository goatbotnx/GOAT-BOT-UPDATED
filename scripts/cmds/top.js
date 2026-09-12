const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "top",
    version: "7.0",
    author: "xalman",
    role: 0,
    shortDescription: {
      en: "Top Richest Leaderboard"
    },
    longDescription: {
      en: "Display the richest users with profile pictures and stylish leaderboard design."
    },
    category: "RANK",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event, usersData, message }) {
    const ACCESS_TOKEN = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";

    try {
      const allUsers = await usersData.getAll();

      const validUsers = allUsers
        .filter(user => {
          try {
            return BigInt(String(user.money || 0)) > 0;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const A = BigInt(String(a.money || 0));
            const B = BigInt(String(b.money || 0));
            return B > A ? 1 : B < A ? -1 : 0;
          } catch {
            return 0;
          }
        });

      const topUsers = validUsers.slice(0, 17);

      if (!topUsers.length) {
        return message.reply("❌ No balance data found.");
      }

      const width = 800;
      const height = 1800;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      function roundedRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }

      function formatMoney(value) {
        try {
          let num = BigInt(String(value || 0));

          if (num < 1000n) {
            return num.toString();
          }

          const units = [
            { value: 10n ** 63n, name: "Vigintillion" },
            { value: 10n ** 60n, name: "Novemdecillion" },
            { value: 10n ** 57n, name: "Octodecillion" },
            { value: 10n ** 54n, name: "Septendecillion" },
            { value: 10n ** 51n, name: "Sexdecillion" },
            { value: 10n ** 48n, name: "Quindecillion" },
            { value: 10n ** 45n, name: "Quattuordecillion" },
            { value: 10n ** 42n, name: "Tredecillion" },
            { value: 10n ** 39n, name: "Duodecillion" },
            { value: 10n ** 36n, name: "Undecillion" },
            { value: 10n ** 33n, name: "Decillion" },
            { value: 10n ** 30n, name: "Nonillion" },
            { value: 10n ** 27n, name: "Octillion" },
            { value: 10n ** 24n, name: "Septillion" },
            { value: 10n ** 21n, name: "Sextillion" },
            { value: 10n ** 18n, name: "Quintillion" },
            { value: 10n ** 15n, name: "Quadrillion" },
            { value: 10n ** 12n, name: "Trillion" },
            { value: 10n ** 9n, name: "Billion" },
            { value: 10n ** 6n, name: "Million" },
            { value: 10n ** 3n, name: "Thousand" }
          ];

          for (const unit of units) {
            if (num >= unit.value) {
              const integerPart = num / unit.value;
              const remainder = num % unit.value;

              let decimal = "";

              if (remainder > 0n) {
                const scaled = (remainder * 100n) / unit.value;
                if (scaled > 0n) {
                  decimal = "." + scaled.toString().padStart(2, "0");
                }
              }

              return integerPart.toString() + decimal + " " + unit.name;
            }
          }

          return num.toString();
        } catch {
          return "0";
        }
      }

      function formatShortMoney(value) {
        try {
          const num = BigInt(String(value || 0));

          const units = [
            { value: 10n ** 63n, name: "Vg" },
            { value: 10n ** 60n, name: "Nov" },
            { value: 10n ** 57n, name: "Oct" },
            { value: 10n ** 54n, name: "Sep" },
            { value: 10n ** 51n, name: "Sex" },
            { value: 10n ** 48n, name: "Qn" },
            { value: 10n ** 45n, name: "Qd" },
            { value: 10n ** 42n, name: "Td" },
            { value: 10n ** 39n, name: "Dd" },
            { value: 10n ** 36n, name: "Ud" },
            { value: 10n ** 33n, name: "Dc" },
            { value: 10n ** 30n, name: "No" },
            { value: 10n ** 27n, name: "Oc" },
            { value: 10n ** 24n, name: "Sp" },
            { value: 10n ** 21n, name: "Sx" },
            { value: 10n ** 18n, name: "Qi" },
            { value: 10n ** 15n, name: "Qa" },
            { value: 10n ** 12n, name: "T" },
            { value: 10n ** 9n, name: "B" },
            { value: 10n ** 6n, name: "M" },
            { value: 10n ** 3n, name: "K" }
          ];

          for (const unit of units) {
            if (num >= unit.value) {
              const integerPart = num / unit.value;
              const remainder = num % unit.value;
              const decimal = (remainder * 100n / unit.value)
                .toString()
                .padStart(2, "0");

              return integerPart.toString() + "." + decimal + unit.name;
            }
          }

          return num.toString();
        } catch {
          return "0";
        }
      }

      function truncate(text, max) {
        text = String(text || "User");
        return text.length > max
          ? text.substring(0, max - 3) + "..."
          : text;
      }

      function drawAvatar(img, x, y, radius, borderColor) {
        ctx.save();

        ctx.beginPath();
        ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();

        if (img) {
          ctx.drawImage(
            img,
            x - radius,
            y - radius,
            radius * 2,
            radius * 2
          );
        } else {
          ctx.fillStyle = "#172033";
          ctx.fillRect(
            x - radius,
            y - radius,
            radius * 2,
            radius * 2
          );

          ctx.fillStyle = "#64748b";
          ctx.font = `bold ${radius}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", x, y);
        }

        ctx.restore();
      }

      ctx.fillStyle = "#02040d";
      ctx.fillRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#020617");
      bg.addColorStop(0.45, "#07152e");
      bg.addColorStop(1, "#030617");

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 18; i++) {
        const glow = ctx.createRadialGradient(
          Math.random() * width,
          Math.random() * height,
          5,
          Math.random() * width,
          Math.random() * height,
          180
        );

        glow.addColorStop(0, "rgba(0,210,255,0.08)");
        glow.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.strokeStyle = "rgba(0,210,255,0.08)";
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.textAlign = "center";

      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("◆  GOAT-BOT-UPDATED ◆", width / 2, 42);

      ctx.font = "bold 46px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#00d9ff";
      ctx.shadowBlur = 18;
      ctx.fillText("TOP BALANCE", width / 2, 90);

      ctx.font = "bold 38px Arial";
      ctx.fillStyle = "#d946ef";
      ctx.fillText("LEADERBOARD", width / 2, 135);

      ctx.shadowBlur = 0;

      ctx.font = "15px Arial";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(
        "BIGGEST BALANCE  •  TOP PLAYERS  •  REAL LEGENDS",
        width / 2,
        165
      );

      const avatarCache = {};

      await Promise.all(
        topUsers.map(async user => {
          try {
            const userId = String(user.userID);

            const fbURL =
              `https://graph.facebook.com/${encodeURIComponent(userId)}` +
              `/picture?width=512&height=512&access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

            const response = await axios.get(fbURL, {
              responseType: "arraybuffer",
              timeout: 15000,
              maxRedirects: 5,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
              }
            });

            avatarCache[userId] = await loadImage(
              Buffer.from(response.data)
            );
          } catch (error) {
            avatarCache[String(user.userID)] = null;
          }
        })
      );

      const top3 = [
        {
          index: 1,
          x: 400,
          y: 275,
          radius: 90,
          color: "#ffd700"
        },
        {
          index: 0,
          x: 205,
          y: 300,
          radius: 72,
          color: "#38bdf8"
        },
        {
          index: 2,
          x: 595,
          y: 300,
          radius: 72,
          color: "#d946ef"
        }
      ];

      const order = [1, 0, 2];

      for (const position of top3) {
        const user = topUsers[position.index];

        if (!user) continue;

        const avatar = avatarCache[String(user.userID)];

        drawAvatar(
          avatar,
          position.x,
          position.y,
          position.radius,
          position.color
        );

        ctx.beginPath();
        ctx.arc(
          position.x + position.radius * 0.7,
          position.y - position.radius * 0.7,
          20,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = position.color;
        ctx.shadowColor = position.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#020617";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `#${position.index + 1}`,
          position.x + position.radius * 0.7,
          position.y - position.radius * 0.7
        );

        ctx.textBaseline = "alphabetic";

        ctx.font = "bold 22px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(
          truncate(user.name, 17),
          position.x,
          position.y + position.radius + 38
        );

        ctx.font = "bold 18px Arial";
        ctx.fillStyle = position.color;
        ctx.fillText(
          "$" + formatShortMoney(user.money),
          position.x,
          position.y + position.radius + 68
        );
      }

      const startY = 500;
      const itemHeight = 68;
      const gap = 11;

      let maxMoney = 1n;

      try {
        maxMoney = BigInt(String(topUsers[0]?.money || 1));
      } catch {
        maxMoney = 1n;
      }

      for (let i = 3; i < topUsers.length; i++) {
        const user = topUsers[i];
        const y = startY + (i - 3) * (itemHeight + gap);

        const rankColors = [
          "#22d3ee",
          "#38bdf8",
          "#a78bfa",
          "#f472b6",
          "#34d399"
        ];

        const rankColor = rankColors[(i - 3) % rankColors.length];

        ctx.save();

        roundedRect(
          32,
          y,
          width - 64,
          itemHeight,
          15
        );

        ctx.fillStyle = "rgba(8,15,35,0.92)";
        ctx.shadowColor = rankColor;
        ctx.shadowBlur = 10;
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.strokeStyle = rankColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        ctx.beginPath();
        ctx.arc(65, y + 34, 20, 0, Math.PI * 2);
        ctx.fillStyle = rankColor;
        ctx.fill();

        ctx.font = "bold 15px Arial";
        ctx.fillStyle = "#020617";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`#${i + 1}`, 65, y + 34);

        ctx.textBaseline = "alphabetic";

        const avatar = avatarCache[String(user.userID)];

        drawAvatar(
          avatar,
          115,
          y + 34,
          25,
          rankColor
        );

        ctx.textAlign = "left";
        ctx.font = "bold 17px Arial";
        ctx.fillStyle = "#f8fafc";

        ctx.fillText(
          truncate(user.name, 15),
          153,
          y + 39
        );

        ctx.font = "13px Arial";
        ctx.fillStyle = "#64748b";
        ctx.fillText(
          "RANK #" + (i + 1),
          153,
          y + 57
        );

        const barX = 320;
        const barY = y + 29;
        const barWidth = 220;
        const barHeight = 10;

        roundedRect(
          barX,
          barY,
          barWidth,
          barHeight,
          5
        );

        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fill();

        let money = 0n;

        try {
          money = BigInt(String(user.money || 0));
        } catch {
          money = 0n;
        }

        let ratio = Number(money) / Number(maxMoney);

        if (!isFinite(ratio) || ratio <= 0) {
          ratio = 0.02;
        }

        ratio = Math.max(0.02, Math.min(ratio, 1));

        const activeWidth = Math.max(
          10,
          barWidth * ratio
        );

        const barGradient = ctx.createLinearGradient(
          barX,
          0,
          barX + activeWidth,
          0
        );

        barGradient.addColorStop(0, "#00d9ff");
        barGradient.addColorStop(0.5, "#38bdf8");
        barGradient.addColorStop(1, "#a855f7");

        roundedRect(
          barX,
          barY,
          activeWidth,
          barHeight,
          5
        );

        ctx.fillStyle = barGradient;
        ctx.shadowColor = "#00d9ff";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.textAlign = "right";
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#22d3ee";

        ctx.fillText(
          "$" + formatShortMoney(user.money),
          width - 48,
          y + 39
        );
      }

      ctx.textAlign = "center";

      ctx.font = "bold 15px Arial";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(
        "BIGGER BALANCE  •  BIGGER DREAMS",
        width / 2,
        height - 65
      );

      ctx.font = "12px Arial";
      ctx.fillStyle = "#64748b";
      ctx.fillText(
        "MADE BY XALMAN",
        width / 2,
        height - 38
      );

      const cacheDir = path.join(__dirname, "cache");

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, {
          recursive: true
        });
      }

      const imagePath = path.join(
        cacheDir,
        `top_${Date.now()}.png`
      );

      fs.writeFileSync(
        imagePath,
        canvas.toBuffer("image/png")
      );

      return message.reply(
        {
          body: " Balance Leaderboard",
          attachment: fs.createReadStream(imagePath)
        },
        () => {
          setTimeout(() => {
            try {
              if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
              }
            } catch {}
          }, 5000);
        }
      );

    } catch (error) {
      console.error("TOP COMMAND ERROR:", error);

      return message.reply(
        "❌ Failed to generate leaderboard."
      );
    }
  }
};
