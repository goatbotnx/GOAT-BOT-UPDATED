const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const LIVE_SESSIONS = new Map();

module.exports = {
  config: {
    name: "top",
    version: "7.1",
    author: "xalman",
    role: 0,
    shortDescription: {
      en: "Top Balance Leaderboard"
    },
    longDescription: {
      en: "Show top richest users with real-time balance updating."
    },
    category: "RANK",
    guide: {
      en: "{pn}\n{pn} live\n{pn} stop"
    }
  },

  onStart: async function ({ api, event, usersData, message, args }) {
    const { threadID, messageID } = event;
    const mode = (args[0] || "").toLowerCase();

    if (mode === "stop") {
      const session = LIVE_SESSIONS.get(threadID);

      if (!session) {
        return message.reply("⚠️ No live leaderboard is running.");
      }

      clearInterval(session.interval);

      try {
        if (session.messageID) {
          await api.unsendMessage(session.messageID);
        }
      } catch (e) {}

      LIVE_SESSIONS.delete(threadID);

      return message.reply("🛑 Live leaderboard stopped.");
    }

    if (mode === "live") {
      if (LIVE_SESSIONS.has(threadID)) {
        return message.reply("⚡ Live leaderboard is already running.");
      }

      api.setMessageReaction("⏳", messageID, () => {}, true);

      try {
        const result = await createLeaderboard(api, usersData);

        const sent = await message.reply({
          body:
            "🏆 𝗟𝗜𝗩𝗘 𝗟𝗘𝗔𝗗𝗘𝗥𝗕𝗢𝗔𝗥𝗗\n" +
            "⚡ Auto updating every 10 seconds",
          attachment: fs.createReadStream(result.filePath)
        });

        cleanupFile(result.filePath);

        api.setMessageReaction("✅", messageID, () => {}, true);

        const session = {
          messageID: sent.messageID,
          interval: null,
          updating: false
        };

        session.interval = setInterval(async () => {
          if (session.updating) return;

          session.updating = true;

          try {
            const latest = await createLeaderboard(api, usersData);

            try {
              await api.unsendMessage(session.messageID);
            } catch (e) {}

            const newMessage = await api.sendMessage(
              {
                body:
                  "🏆 𝗟𝗜𝗩𝗘 𝗟𝗘𝗔𝗗𝗘𝗥𝗕𝗢𝗔𝗥𝗗\n" +
                  "⚡ Auto updating every 10 seconds",
                attachment: fs.createReadStream(latest.filePath)
              },
              threadID
            );

            cleanupFile(latest.filePath);

            session.messageID = newMessage.messageID;
          } catch (error) {
            console.error("Live leaderboard error:", error);
          }

          session.updating = false;
        }, 10000);

        LIVE_SESSIONS.set(threadID, session);

        setTimeout(() => {
          const current = LIVE_SESSIONS.get(threadID);

          if (current === session) {
            clearInterval(session.interval);
            LIVE_SESSIONS.delete(threadID);

            try {
              api.unsendMessage(session.messageID);
            } catch (e) {}
          }
        }, 30 * 60 * 1000);

        return;
      } catch (error) {
        console.error(error);

        api.setMessageReaction("❌", messageID, () => {}, true);

        return message.reply(
          "❌ Failed to create live leaderboard."
        );
      }
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const result = await createLeaderboard(api, usersData);

      api.setMessageReaction("🏆", messageID, () => {}, true);

      return message.reply(
        {
          body: "🏆 𝗧𝗢𝗣 𝗕𝗔𝗟𝗔𝗡𝗖𝗘 𝗟𝗘𝗔𝗗𝗘𝗥𝗕𝗢𝗔𝗥𝗗",
          attachment: fs.createReadStream(result.filePath)
        },
        () => {
          cleanupFile(result.filePath);
        }
      );
    } catch (error) {
      console.error("Leaderboard error:", error);

      api.setMessageReaction("❌", messageID, () => {}, true);

      return message.reply(
        "❌ Failed to generate leaderboard."
      );
    }
  }
};

async function createLeaderboard(api, usersData) {
  const allUsers = await usersData.getAll();

  const validUsers = allUsers.filter(user => {
    if (!user || !user.userID) return false;

    const money = Number(user.money);

    return (
      Number.isFinite(money) ||
      money === Infinity
    );
  });

  const topUsers = validUsers
    .sort((a, b) => {
      const moneyA = Number(a.money);
      const moneyB = Number(b.money);

      if (moneyA === Infinity && moneyB !== Infinity) return -1;
      if (moneyB === Infinity && moneyA !== Infinity) return 1;

      return moneyB - moneyA;
    })
    .slice(0, 17);

  const userInfoCache = {};

  await Promise.all(
    topUsers.map(async user => {
      try {
        const result = await api.getUserInfo(user.userID);

        const info =
          result?.[user.userID] ||
          result ||
          {};

        userInfoCache[user.userID] = {
          name:
            info.name ||
            user.name ||
            "Facebook user",

          thumbSrc:
            info.thumbSrc ||
            null
        };
      } catch (error) {
        userInfoCache[user.userID] = {
          name:
            user.name ||
            "Facebook user",

          thumbSrc: null
        };
      }
    })
  );

  const avatarCache = {};

  await Promise.all(
    topUsers.map(async user => {
      const info =
        userInfoCache[user.userID];

      if (!info?.thumbSrc) return;

      try {
        const response = await axios.get(
          info.thumbSrc,
          {
            responseType: "arraybuffer",
            timeout: 10000
          }
        );

        avatarCache[user.userID] =
          await loadImage(
            Buffer.from(response.data)
          );
      } catch (error) {
        avatarCache[user.userID] = null;
      }
    })
  );

  const width = 800;
  const height = 1800;

  const canvas = createCanvas(
    width,
    height
  );

  const ctx = canvas.getContext("2d");

  drawBackground(
    ctx,
    width,
    height
  );

  drawHeader(
    ctx,
    width
  );

  drawTopThree(
    ctx,
    topUsers,
    avatarCache,
    userInfoCache,
    width
  );

  drawRankingList(
    ctx,
    topUsers,
    avatarCache,
    userInfoCache,
    width
  );

  drawFooter(
    ctx,
    width,
    height
  );

  const cacheDir =
    path.join(__dirname, "cache");

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, {
      recursive: true
    });
  }

  const filePath = path.join(
    cacheDir,
    `top_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.png`
  );

  fs.writeFileSync(
    filePath,
    canvas.toBuffer("image/png")
  );

  return {
    filePath,
    users: topUsers
  };
}

function drawBackground(
  ctx,
  width,
  height
) {
  ctx.fillStyle = "#020617";
  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  const bg =
    ctx.createLinearGradient(
      0,
      0,
      width,
      height
    );

  bg.addColorStop(
    0,
    "#020617"
  );

  bg.addColorStop(
    0.35,
    "#07152f"
  );

  bg.addColorStop(
    0.65,
    "#0a1230"
  );

  bg.addColorStop(
    1,
    "#020617"
  );

  ctx.fillStyle = bg;

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  ctx.globalAlpha = 0.15;

  for (
    let x = 0;
    x < width;
    x += 40
  ) {
    ctx.strokeStyle = "#248cff";
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);

    ctx.stroke();
  }

  for (
    let y = 0;
    y < height;
    y += 40
  ) {
    ctx.strokeStyle = "#248cff";
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(0, y);
    ctx.lineTo(width, y);

    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  const glow1 =
    ctx.createRadialGradient(
      width / 2,
      230,
      20,
      width / 2,
      230,
      400
    );

  glow1.addColorStop(
    0,
    "rgba(0,153,255,0.20)"
  );

  glow1.addColorStop(
    1,
    "rgba(0,153,255,0)"
  );

  ctx.fillStyle = glow1;

  ctx.fillRect(
    0,
    0,
    width,
    600
  );

  const glow2 =
    ctx.createRadialGradient(
      100,
      1300,
      20,
      100,
      1300,
      300
    );

  glow2.addColorStop(
    0,
    "rgba(140,0,255,0.12)"
  );

  glow2.addColorStop(
    1,
    "rgba(140,0,255,0)"
  );

  ctx.fillStyle = glow2;

  ctx.fillRect(
    0,
    900,
    width,
    500
  );
}

function drawHeader(
  ctx,
  width
) {
  ctx.textAlign = "center";

  ctx.font =
    "bold 22px Arial";

  ctx.fillStyle = "#38d9ff";

  ctx.fillText(
    "",
    width / 2,
    42
  );

  ctx.font =
    "bold 46px Arial";

  ctx.fillStyle = "#ffffff";

  ctx.shadowColor =
    "#168cff";

  ctx.shadowBlur = 18;

  ctx.fillText(
    "TOP BALANCE",
    width / 2,
    92
  );

  ctx.shadowBlur = 0;

  ctx.font =
    "bold 40px Arial";

  ctx.fillStyle =
    "#ff38d1";

  ctx.fillText(
    "LEADERBOARD",
    width / 2,
    137
  );

  ctx.font =
    "16px Arial";

  ctx.fillStyle =
    "#a8c7e8";

  ctx.fillText(
    "BIGGEST BALANCE  •  TOP PLAYERS  •  REAL LEGENDS",
    width / 2,
    169
  );

  ctx.strokeStyle =
    "#1ccfff";

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.moveTo(
    60,
    190
  );

  ctx.lineTo(
    width - 60,
    190
  );

  ctx.stroke();
}

function drawTopThree(
  ctx,
  topUsers,
  avatarCache,
  userInfoCache,
  width
) {
  const positions = [
    {
      index: 1,
      x: 175,
      y: 310,
      radius: 62,
      color: "#b9d7ff",
      rank: "2"
    },
    {
      index: 0,
      x: width / 2,
      y: 290,
      radius: 78,
      color: "#ffd21a",
      rank: "1"
    },
    {
      index: 2,
      x: 625,
      y: 310,
      radius: 62,
      color: "#d86cff",
      rank: "3"
    }
  ];

  for (const pos of positions) {
    const user =
      topUsers[pos.index];

    if (!user) continue;

    const info =
      userInfoCache[
        user.userID
      ] || {};

    drawAvatar(
      ctx,
      avatarCache[user.userID],
      pos.x,
      pos.y,
      pos.radius,
      pos.color
    );

    ctx.beginPath();

    ctx.arc(
      pos.x +
        pos.radius * 0.72,
      pos.y -
        pos.radius * 0.72,
      17,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      pos.color;

    ctx.fill();

    ctx.fillStyle =
      "#07101f";

    ctx.font =
      "bold 14px Arial";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      pos.rank,
      pos.x +
        pos.radius * 0.72,
      pos.y -
        pos.radius * 0.72
    );

    ctx.textBaseline =
      "alphabetic";

    let name =
      info.name ||
      user.name ||
      "Facebook user";

    if (name.length > 18) {
      name =
        name.substring(
          0,
          16
        ) + "...";
    }

    ctx.font =
      pos.index === 0
        ? "bold 22px Arial"
        : "bold 19px Arial";

    ctx.fillStyle =
      "#ffffff";

    ctx.fillText(
      name,
      pos.x,
      pos.y +
        pos.radius +
        32
    );

    ctx.font =
      "bold 19px Arial";

    ctx.fillStyle =
      pos.color;

    ctx.fillText(
      `$${formatNumber(user.money)}`,
      pos.x,
      pos.y +
        pos.radius +
        62
    );
  }
}

function drawRankingList(
  ctx,
  topUsers,
  avatarCache,
  userInfoCache,
  width
) {
  const startY = 500;
  const itemHeight = 65;
  const gap = 10;

  ctx.textAlign =
    "left";

  ctx.font =
    "bold 16px Arial";

  ctx.fillStyle =
    "#8faed0";

  ctx.fillText(
    "◆ RANKING",
    40,
    470
  );

  ctx.textAlign =
    "right";

  ctx.fillStyle =
    "#36dfff";

  ctx.fillText(
    "BALANCE",
    width - 40,
    470
  );

  const balances =
    topUsers.map(user => {
      const value =
        Number(user.money);

      if (
        value === Infinity
      ) {
        return Infinity;
      }

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return 0;
      }

      return value;
    });

  const finiteBalances =
    balances.filter(
      value =>
        Number.isFinite(value) &&
        value > 0
    );

  const maxFiniteBalance =
    Math.max(
      ...finiteBalances,
      1
    );

  const minFiniteBalance =
    Math.min(
      ...finiteBalances,
      1
    );

  for (
    let i = 3;
    i < topUsers.length;
    i++
  ) {
    const user =
      topUsers[i];

    const y =
      startY +
      (i - 3) *
        (itemHeight + gap);

    drawCard(
      ctx,
      30,
      y,
      width - 60,
      itemHeight,
      i
    );

    ctx.textAlign =
      "left";

    ctx.font =
      "bold 17px Arial";

    ctx.fillStyle =
      "#44dfff";

    ctx.fillText(
      `#${i + 1}`,
      45,
      y + 39
    );

    const avatarX = 80;
    const avatarY =
      y + 32;
    const avatarRadius = 20;

    drawSmallAvatar(
      ctx,
      avatarCache[user.userID],
      avatarX,
      avatarY,
      avatarRadius
    );

    const info =
      userInfoCache[
        user.userID
      ] || {};

    let name =
      info.name ||
      user.name ||
      "Facebook user";

    if (name.length > 15) {
      name =
        name.substring(
          0,
          13
        ) + "...";
    }

    ctx.font =
      "bold 17px Arial";

    ctx.fillStyle =
      "#e9f4ff";

    ctx.fillText(
      name,
      125,
      y + 38
    );

    const barX = 270;
    const barY = y + 26;
    const barWidth = 245;
    const barHeight = 12;

    drawRoundedRect(
      ctx,
      barX,
      barY,
      barWidth,
      barHeight,
      6,
      "rgba(255,255,255,0.07)"
    );

    const money =
      Number(user.money);

    let ratio = 0;

    if (
      money === Infinity
    ) {
      ratio = 1;
    } else if (
      Number.isFinite(money) &&
      money > 0
    ) {
      const maxLog =
        Math.log10(
          maxFiniteBalance + 1
        );

      const minLog =
        Math.log10(
          minFiniteBalance + 1
        );

      const currentLog =
        Math.log10(
          money + 1
        );

      if (
        maxLog > minLog
      ) {
        ratio =
          (currentLog - minLog) /
          (maxLog - minLog);
      } else {
        ratio = 1;
      }
    }

    ratio = Math.max(
      0,
      Math.min(
        1,
        ratio
      )
    );

    const activeWidth =
      money === Infinity
        ? barWidth
        : money > 0
        ? Math.max(
            10,
            ratio * barWidth
          )
        : 4;

    const barGradient =
      ctx.createLinearGradient(
        barX,
        0,
        barX +
          activeWidth,
        0
      );

    barGradient.addColorStop(
      0,
      "#00d9ff"
    );

    barGradient.addColorStop(
      0.5,
      "#00f0ff"
    );

    barGradient.addColorStop(
      1,
      "#a855f7"
    );

    ctx.shadowColor =
      "#00d9ff";

    ctx.shadowBlur = 10;

    drawRoundedRect(
      ctx,
      barX,
      barY,
      activeWidth,
      barHeight,
      6,
      barGradient
    );

    ctx.shadowBlur = 0;

    ctx.textAlign =
      "right";

    ctx.font =
      "bold 17px Arial";

    if (
      money === Infinity
    ) {
      ctx.fillStyle =
        "#ffd21a";
    } else {
      ctx.fillStyle =
        "#36f5d2";
    }

    ctx.fillText(
      `$${formatNumber(user.money)}`,
      width - 45,
      y + 39
    );
  }
}

function drawCard(
  ctx,
  x,
  y,
  width,
  height,
  index
) {
  const gradient =
    ctx.createLinearGradient(
      x,
      y,
      x + width,
      y
    );

  gradient.addColorStop(
    0,
    "rgba(5,25,55,0.92)"
  );

  gradient.addColorStop(
    0.5,
    "rgba(8,18,48,0.95)"
  );

  gradient.addColorStop(
    1,
    "rgba(32,8,55,0.92)"
  );

  drawRoundedRect(
    ctx,
    x,
    y,
    width,
    height,
    12,
    gradient
  );

  ctx.strokeStyle =
    index % 2 === 0
      ? "#10cfff"
      : "#9d4edd";

  ctx.lineWidth = 1.5;

  ctx.shadowColor =
    index % 2 === 0
      ? "#10cfff"
      : "#9d4edd";

  ctx.shadowBlur = 5;

  ctx.beginPath();

  ctx.roundRect(
    x,
    y,
    width,
    height,
    12
  );

  ctx.stroke();

  ctx.shadowBlur = 0;
}

function drawAvatar(
  ctx,
  image,
  x,
  y,
  radius,
  borderColor
) {
  ctx.save();

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius + 7,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle =
    borderColor;

  ctx.lineWidth = 3;

  ctx.shadowColor =
    borderColor;

  ctx.shadowBlur = 15;

  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.clip();

  if (image) {
    ctx.drawImage(
      image,
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );
  } else {
    ctx.fillStyle =
      "#17233c";

    ctx.fillRect(
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );

    ctx.fillStyle =
      "#718096";

    ctx.font =
      "bold 28px Arial";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      "?",
      x,
      y
    );
  }

  ctx.restore();
}

function drawSmallAvatar(
  ctx,
  image,
  x,
  y,
  radius
) {
  ctx.save();

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius + 2,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle =
    "#22d3ee";

  ctx.lineWidth = 1.5;

  ctx.stroke();

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );

  ctx.clip();

  if (image) {
    ctx.drawImage(
      image,
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );
  } else {
    ctx.fillStyle =
      "#1e293b";

    ctx.fillRect(
      x - radius,
      y - radius,
      radius * 2,
      radius * 2
    );

    ctx.fillStyle =
      "#94a3b8";

    ctx.font =
      "bold 16px Arial";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.fillText(
      "?",
      x,
      y
    );
  }

  ctx.restore();
}

function drawFooter(
  ctx,
  width,
  height
) {
  ctx.textAlign =
    "center";

  ctx.font =
    "bold 18px Arial";

  ctx.fillStyle =
    "#36dfff";

  ctx.fillText(
    "◆  GOAT-BOT-UPDATED ◆",
    width / 2,
    height - 70
  );

  ctx.font =
    "13px Arial";

  ctx.fillStyle =
    "rgba(255,255,255,0.45)";

  ctx.fillText(
    "MADE BY XALMAN  •  BIGGER BALANCE, BIGGER DREAMS",
    width / 2,
    height - 43
  );
}

function drawRoundedRect(
  ctx,
  x,
  y,
  width,
  height,
  radius,
  fill
) {
  ctx.beginPath();

  ctx.moveTo(
    x + radius,
    y
  );

  ctx.arcTo(
    x + width,
    y,
    x + width,
    y + height,
    radius
  );

  ctx.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    radius
  );

  ctx.arcTo(
    x,
    y + height,
    x,
    y,
    radius
  );

  ctx.arcTo(
    x,
    y,
    x + width,
    y,
    radius
  );

  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();
}

function formatNumber(num) {
  const n = Number(num);

  if (n === Infinity) {
    return "∞ Unlimited";
  }

  if (
    n === -Infinity
  ) {
    return "−∞";
  }

  if (
    Number.isNaN(n)
  ) {
    return "0";
  }

  if (
    !Number.isFinite(n)
  ) {
    return "∞ Unlimited";
  }

  if (n < 1000) {
    return Math.floor(n)
      .toString();
  }

  const units = [
    {
      value: 1e63,
      name: "Vigintillion"
    },
    {
      value: 1e60,
      name: "Novemdecillion"
    },
    {
      value: 1e57,
      name: "Octodecillion"
    },
    {
      value: 1e54,
      name: "Septendecillion"
    },
    {
      value: 1e51,
      name: "Sexdecillion"
    },
    {
      value: 1e48,
      name: "Quindecillion"
    },
    {
      value: 1e45,
      name: "Quattuordecillion"
    },
    {
      value: 1e42,
      name: "Tredecillion"
    },
    {
      value: 1e39,
      name: "Duodecillion"
    },
    {
      value: 1e36,
      name: "Undecillion"
    },
    {
      value: 1e33,
      name: "Decillion"
    },
    {
      value: 1e30,
      name: "Nonillion"
    },
    {
      value: 1e27,
      name: "Octillion"
    },
    {
      value: 1e24,
      name: "Septillion"
    },
    {
      value: 1e21,
      name: "Sextillion"
    },
    {
      value: 1e18,
      name: "Quintillion"
    },
    {
      value: 1e15,
      name: "Quadrillion"
    },
    {
      value: 1e12,
      name: "Trillion"
    },
    {
      value: 1e9,
      name: "Billion"
    },
    {
      value: 1e6,
      name: "Million"
    },
    {
      value: 1e3,
      name: "Thousand"
    }
  ];

  for (
    const unit of units
  ) {
    if (
      n >= unit.value
    ) {
      const value =
        n / unit.value;

      return (
        value
          .toFixed(2)
          .replace(
            /\.00$/,
            ""
          )
          .replace(
            /(\.\d)0$/,
            "$1"
          ) +
        " " +
        unit.name
      );
    }
  }

  return n.toString();
}

function cleanupFile(
  filePath
) {
  setTimeout(() => {
    try {
      if (
        fs.existsSync(
          filePath
        )
      ) {
        fs.unlinkSync(
          filePath
        );
      }
    } catch (error) {}
  }, 5000);
}
