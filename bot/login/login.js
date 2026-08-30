"use strict";

process.stdout.write("\x1b]2;LOGIN.JS - by xalman\x1b\x5c");

const defaultRequire = require;
const gradient = defaultRequire("gradient-string");
const axios = defaultRequire("axios");
const path = defaultRequire("path");
const readline = defaultRequire("readline");
const fs = defaultRequire("fs-extra");
const QRCodeReader = defaultRequire("qrcode-reader");
const Canvas = defaultRequire("canvas");
const fca = defaultRequire("fca-nx");

const login =
  typeof fca === "function"
    ? fca
    : typeof fca.login === "function"
      ? fca.login
      : typeof fca.default === "function"
        ? fca.default
        : null;

if (typeof login !== "function") {
  console.error("FCA login function is not available.");
  console.error("Available exports:", Object.keys(fca || {}));
  process.exit(1);
}

/* =========================================================
 * VERSION
 * ======================================================= */

function compareVersion(v1, v2) {
  const a = String(v1).split(".").map(Number);
  const b = String(v2).split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return 1;
    if ((a[i] || 0) < (b[i] || 0)) return -1;
  }

  return 0;
}

/* =========================================================
 * APP STATE
 * ======================================================= */

function filterKeysAppState(appState) {
  if (!Array.isArray(appState)) return [];

  const allowed = new Set([
    "c_user",
    "xs",
    "datr",
    "fr",
    "sb",
    "i_user"
  ]);

  return appState.filter(item =>
    item &&
    allowed.has(item.key)
  );
}

function getAccountIdFromAppState(appState) {
  if (!Array.isArray(appState)) return null;

  const cookie = appState.find(
    item =>
      item &&
      item.key === "c_user"
  );

  return cookie
    ? cookie.value
    : null;
}

function getAccountIdFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    try {
      const parsed =
        JSON.parse(content);

      if (Array.isArray(parsed)) {
        return getAccountIdFromAppState(
          parsed
        );
      }
    } catch {}

    const match = content.match(
      /c_user[\s\S]*?"value"\s*:\s*"(\d+)"/
    );

    return match
      ? match[1]
      : null;
  } catch {
    return null;
  }
}

/* =========================================================
 * NAVIGATOR
 * ======================================================= */

if (
  typeof global.navigator ===
  "undefined"
) {
  global.navigator = {};
}

if (
  typeof global.navigator.userAgent !==
  "string"
) {
  global.navigator.userAgent =
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36";
}

if (
  typeof global.navigator.platform !==
  "string"
) {
  global.navigator.platform =
    process.platform === "win32"
      ? "Win32"
      : process.platform === "darwin"
        ? "MacIntel"
        : "Linux armv8l";
}

if (
  typeof global.navigator.language !==
  "string"
) {
  global.navigator.language =
    "en-US";
}

if (
  !Array.isArray(
    global.navigator.languages
  )
) {
  global.navigator.languages = [
    "en-US",
    "en"
  ];
}

if (
  typeof global.navigator.appVersion !==
  "string"
) {
  global.navigator.appVersion =
    global.navigator.userAgent;
}

if (
  typeof global.navigator.vendor !==
  "string"
) {
  global.navigator.vendor =
    "Google Inc.";
}

/* =========================================================
 * GLOBALS
 * ======================================================= */

const {
  writeFileSync,
  readFileSync,
  existsSync,
  statSync
} = fs;

const handlerWhenListenHasError =
  require(
    "./handlerWhenListenHasError.js"
  );

const {
  callbackListenTime,
  storage5Message
} = global.GoatBot;

const {
  log,
  logColor,
  createOraDots,
  jsonStringifyColor,
  getText,
  colors,
  randomString
} = global.utils;

const {
  dirAccount
} = global.client;

const {
  facebookAccount
} =
  global.GoatBot.config;

const currentVersion =
  require(
    `${process.cwd()}/package.json`
  ).version;

const accountBaseDir =
  path.dirname(dirAccount);

/* =========================================================
 * ACCOUNT CONFIG
 * ======================================================= */

const ACCOUNT_FILES = [
  "account.txt",
  "account2.txt"
];

const ACTIVE_ACCOUNT_INFO =
  path.join(
    accountBaseDir,
    "active_account.json"
  );

let currentAccountFile = null;
let currentAccountId = null;

let switchingAccount = false;
let reloginTimer = null;

/*
 * Accounts which already failed during
 * the current automatic switch cycle.
 *
 * This prevents:
 *
 * account1 -> account2 -> account1
 * -> account2 -> infinite loop
 */
const failedAccounts =
  new Set();

/* =========================================================
 * UI
 * ======================================================= */

function createLine(
  content,
  isMaxWidth = false
) {
  let width =
    process.stdout.columns || 80;

  if (
    !isMaxWidth &&
    width > 50
  ) {
    width = 50;
  }

  if (!content) {
    return "─".repeat(width);
  }

  content =
    ` ${String(content).trim()} `;

  const left =
    Math.floor(
      (width - content.length) / 2
    );

  const right =
    width -
    left -
    content.length;

  return (
    "─".repeat(
      Math.max(left, 0)
    ) +
    content +
    "─".repeat(
      Math.max(right, 0)
    )
  );
}

function centerText(
  text,
  length
) {
  const width =
    process.stdout.columns || 80;

  const len =
    typeof length === "number"
      ? length
      : String(text).length;

  const left =
    Math.floor(
      (width - len) / 2
    );

  console.log(
    " ".repeat(
      Math.max(left, 0)
    ) +
    text +
    " ".repeat(
      Math.max(
        width -
          left -
          len,
        0
      )
    )
  );
}

const titles = [
  [
    "███╗   ██╗██╗  ██╗     ██████╗  ██████╗  █████╗ ████████╗",
    "████╗  ██║╚██╗██╔╝    ██╔════╝ ██╔═══██╗██╔══██╗╚══██╔══╝",
    "██╔██╗ ██║ ╚███╔╝     ██║  ███╗██║   ██║███████║   ██║   ",
    "██║╚██╗██║ ██╔██╗     ██║   ██║██║   ██║██╔══██║   ██║   ",
    "██║ ╚████║██╔╝ ██╗    ╚██████╔╝╚██████╔╝██║  ██║   ██║   ",
    "╚═╝  ╚═══╝╚═╝  ╚═╝     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
  ],
  [
    "NX-GOAT-BOT-@" +
      currentVersion
  ],
  [
    "NX-GOAT-BOT"
  ]
];

const maxWidth =
  process.stdout.columns || 80;

const title =
  maxWidth > 58
    ? titles[0]
    : maxWidth > 36
      ? titles[1]
      : titles[2];

console.log(
  gradient(
    "#f5af19",
    "#f12711"
  )(
    createLine(
      null,
      true
    )
  )
);

console.log();

for (const line of title) {
  const colored =
    gradient(
      "#FA8BFF",
      "#2BD2FF",
      "#2BFF88"
    )(line);

  centerText(
    colored,
    line.length
  );
}

const sub = [
  `NX-GOAT-BOT-@${currentVersion} - A simple Bot chat messenger use personal account`,
  "Created by NTKhang with ♡ | Fixed by XALMAN",
  "GITHUB: https://github.com/goatbotnx/NX-GOAT-BOT-V3",
  "ALL VERSIONS NOT RELEASED HERE ARE FAKE"
];

for (const t of sub) {
  const colored =
    gradient(
      "#9F98E8",
      "#AFF6CF"
    )(t);

  centerText(
    colored,
    t.length
  );
}

console.log(createLine());

/* =========================================================
 * QR
 * ======================================================= */

const qr =
  new QRCodeReader();

qr.readQrCode =
  async function(filePath) {
    const image =
      await Canvas.loadImage(
        filePath
      );

    const canvas =
      Canvas.createCanvas(
        image.width,
        image.height
      );

    const ctx =
      canvas.getContext("2d");

    ctx.drawImage(
      image,
      0,
      0
    );

    const data =
      ctx.getImageData(
        0,
        0,
        image.width,
        image.height
      );

    return new Promise(
      (resolve, reject) => {
        let finished = false;

        const finish = (
          callback,
          value
        ) => {
          if (finished) return;

          finished = true;

          callback(value);
        };

        qr.callback =
          (err, result) => {
            if (err) {
              finish(
                reject,
                err
              );
            } else {
              finish(
                resolve,
                result.result
              );
            }
          };

        try {
          qr.decode(data);
        } catch (err) {
          finish(
            reject,
            err
          );
        }

        setTimeout(() => {
          finish(
            reject,
            new Error(
              "QR decode timeout"
            )
          );
        }, 10000);
      }
    );
  };

/* =========================================================
 * ACCOUNT FILE HELPERS
 * ======================================================= */

function getAccountFilePaths() {
  return ACCOUNT_FILES.map(
    file =>
      path.join(
        accountBaseDir,
        file
      )
  );
}

function getAccountPath(
  fileName
) {
  if (!fileName) {
    return null;
  }

  return path.join(
    accountBaseDir,
    fileName
  );
}

function getExistingAccountFiles() {
  return getAccountFilePaths().filter(
    file => {
      try {
        return (
          existsSync(file) &&
          statSync(file).isFile() &&
          statSync(file).size > 0
        );
      } catch {
        return false;
      }
    }
  );
}

/* =========================================================
 * ACTIVE ACCOUNT STATE
 * ======================================================= */

function readActiveAccountInfo() {
  try {
    if (
      !existsSync(
        ACTIVE_ACCOUNT_INFO
      )
    ) {
      return null;
    }

    const data =
      JSON.parse(
        readFileSync(
          ACTIVE_ACCOUNT_INFO,
          "utf8"
        )
      );

    if (
      !data ||
      typeof data !== "object"
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function saveActiveAccountInfo(
  fileName,
  accountId
) {
  currentAccountFile =
    fileName || null;

  currentAccountId =
    accountId || null;

  try {
    writeFileSync(
      ACTIVE_ACCOUNT_INFO,
      JSON.stringify(
        {
          account:
            fileName || null,

          accountNumber:
            fileName ===
            "account2.txt"
              ? 2
              : fileName ===
                "account.txt"
                ? 1
                : null,

          accountId:
            accountId || null,

          file:
            fileName || null,

          updatedAt:
            new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err) {
    log.warn(
      "ACCOUNT",
      `Could not save active account info: ${err.message}`
    );
  }

  global.GoatBot.currentAccountFile =
    fileName || null;

  global.GoatBot.currentAccountId =
    accountId || null;
}

function getCurrentAccountFile() {
  if (
    currentAccountFile &&
    ACCOUNT_FILES.includes(
      currentAccountFile
    )
  ) {
    return currentAccountFile;
  }

  const info =
    readActiveAccountInfo();

  if (
    info &&
    ACCOUNT_FILES.includes(
      info.file
    )
  ) {
    currentAccountFile =
      info.file;

    currentAccountId =
      info.accountId || null;

    return info.file;
  }

  if (
    info &&
    ACCOUNT_FILES.includes(
      info.account
    )
  ) {
    currentAccountFile =
      info.account;

    currentAccountId =
      info.accountId || null;

    return info.account;
  }

  return null;
}

function getOrderedAccountFiles(
  preferredFile = null
) {
  const files =
    getExistingAccountFiles();

  const preferred =
    preferredFile ||
    getCurrentAccountFile();

  if (!preferred) {
    return files;
  }

  return [
    ...files.filter(
      file =>
        path.basename(file) ===
        preferred
    ),

    ...files.filter(
      file =>
        path.basename(file) !==
        preferred
    )
  ];
}

/* =========================================================
 * ACCOUNT READING
 * ======================================================= */

function readAccountFile(
  filePath
) {
  try {
    const content =
      readFileSync(
        filePath,
        "utf8"
      ).trim();

    return content || null;
  } catch {
    return null;
  }
}

function isNetScapeCookie(
  str
) {
  return /(.+)\t(1|TRUE|true)\t([\w\/.-]*)\t(1|TRUE|true)\t\d+\t([\w-]+)\t(.+)/i.test(
    str
  );
}

function netScapeToAppState(
  cookieData
) {
  const cookies = [];

  const lines =
    cookieData.split("\n");

  for (const line of lines) {
    if (
      line
        .trim()
        .startsWith("#")
    ) {
      continue;
    }

    const fields =
      line
        .split("\t")
        .map(s => s.trim())
        .filter(Boolean);

    if (
      fields.length < 7
    ) {
      continue;
    }

    let creation;

    try {
      creation =
        new Date(
          Number(fields[4]) *
            1000
        ).toISOString();
    } catch {
      creation =
        new Date().toISOString();
    }

    cookies.push({
      key: fields[5],
      value: fields[6],
      domain: fields[0],
      path: fields[2],
      hostOnly:
        fields[1] === "TRUE",
      creation,
      lastAccessed:
        new Date().toISOString()
    });
  }

  return cookies;
}

function cookieStringToAppState(
  cookieString
) {
  return cookieString
    .split(";")
    .map(pair => {
      const idx =
        pair.indexOf("=");

      if (idx === -1) {
        return null;
      }

      const key =
        pair
          .slice(0, idx)
          .trim();

      const value =
        pair
          .slice(idx + 1)
          .trim();

      if (!key || !value) {
        return null;
      }

      return {
        key,
        value,
        domain:
          "facebook.com",
        path: "/",
        hostOnly: true,
        creation:
          new Date().toISOString(),
        lastAccessed:
          new Date().toISOString()
      };
    })
    .filter(Boolean);
}

function tryParseJSONAppState(
  content
) {
  try {
    const parsed =
      JSON.parse(content);

    if (
      !Array.isArray(parsed) ||
      parsed.length === 0
    ) {
      return null;
    }

    if (
      !parsed.some(
        item =>
          item &&
          (item.key ||
            item.name)
      )
    ) {
      return null;
    }

    return parsed
      .map(item => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return null;
        }

        const copy = {
          ...item
        };

        if (
          copy.name &&
          !copy.key
        ) {
          copy.key =
            copy.name;
        }

        delete copy.name;

        return {
          key: copy.key,

          value:
            copy.value,

          domain:
            copy.domain ||
            "facebook.com",

          path:
            copy.path || "/",

          hostOnly:
            copy.hostOnly !==
            undefined
              ? copy.hostOnly
              : false,

          creation:
            copy.creation ||
            new Date().toISOString(),

          lastAccessed:
            copy.lastAccessed ||
            new Date().toISOString()
        };
      })
      .filter(Boolean);
  } catch {
    return null;
  }
}

function detectAndParseAccount(
  content
) {
  if (!content) {
    return null;
  }

  const json =
    tryParseJSONAppState(
      content
    );

  if (json) {
    return {
      type: "appState",
      data: json
    };
  }

  if (
    content
      .trim()
      .startsWith("EAAAA")
  ) {
    return {
      type: "token",
      data:
        content.trim()
    };
  }

  if (
    content.includes("=") &&
    content.includes(";")
  ) {
    return {
      type: "cookieString",
      data: content
    };
  }

  if (
    isNetScapeCookie(content)
  ) {
    return {
      type: "netscape",
      data: content
    };
  }

  return null;
}

/* =========================================================
 * LOAD APP STATE
 * ======================================================= */

async function getAppStateFromFile(
  filePath
) {
  const content =
    readAccountFile(
      filePath
    );

  if (!content) {
    return null;
  }

  const parsed =
    detectAndParseAccount(
      content
    );

  if (!parsed) {
    return null;
  }

  try {
    switch (parsed.type) {
      case "appState":
        return parsed.data;

      case "token": {
        const getFbstate =
          require(
            process.env.NODE_ENV ===
              "development"
              ? "./getFbstate1.dev.js"
              : "./getFbstate1.js"
          );

        return await getFbstate(
          parsed.data
        );
      }

      case "cookieString":
        return cookieStringToAppState(
          parsed.data
        );

      case "netscape":
        return netScapeToAppState(
          parsed.data
        );

      default:
        return null;
    }
  } catch (e) {
    log.error(
      "ACCOUNT",
      `Failed to parse ${path.basename(filePath)}: ${e.message}`
    );

    return null;
  }
}

async function getAppStateFromEmail(
  spin
) {
  const {
    email,
    password,
    userAgent,
    proxy
  } = facebookAccount;

  const getFbstate =
    require(
      process.env.NODE_ENV ===
        "development"
        ? "./getFbstate1.dev.js"
        : "./getFbstate1.js"
    );

  try {
    if (spin) {
      spin._start();
    }

    const appState =
      await getFbstate(
        email,
        password,
        userAgent,
        proxy
      );

    if (spin) {
      spin._stop();
    }

    return appState;
  } catch (err) {
    if (spin) {
      spin._stop();
    }

    if (
      err.continue &&
      typeof err.continue ===
        "function"
    ) {
      const rl =
        readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

      const code =
        await new Promise(
          resolve => {
            rl.question(
              "Enter 2FA code: ",
              answer => {
                rl.close();

                resolve(
                  answer.trim()
                );
              }
            );
          }
        );

      try {
        return await err.continue(
          code
        );
      } catch (newErr) {
        if (
          newErr.continue
        ) {
          log.warn(
            "2FA",
            "Invalid code, try again."
          );

          return await getAppStateFromEmail(
            spin
          );
        }

        throw newErr;
      }
    }

    throw err;
  }
}

/* =========================================================
 * LOGIN APP STATE
 * ======================================================= */

async function getAppStateToLogin(
  loginWithEmail = false,
  preferredFile = null
) {
  let appState = [];

  if (loginWithEmail) {
    log.info(
      "LOGIN",
      "Attempting login with email & password..."
    );

    const spin =
      createOraDots(
        "Logging in..."
      );

    return await getAppStateFromEmail(
      spin
    );
  }

  const accountFiles =
    getOrderedAccountFiles(
      preferredFile
    );

  if (
    accountFiles.length === 0
  ) {
    log.warn(
      "LOGIN",
      "No account files found. Falling back to email/password..."
    );

    if (
      facebookAccount.email &&
      facebookAccount.password
    ) {
      const spin =
        createOraDots(
          "Logging in with email/password..."
        );

      appState =
        await getAppStateFromEmail(
          spin
        );

      if (
        appState &&
        appState.length > 0
      ) {
        const accountId =
          getAccountIdFromAppState(
            appState
          );

        saveActiveAccountInfo(
          null,
          accountId
        );

        log.success(
          "LOGIN",
          "Successfully logged in with email/password"
        );
      }

      return appState;
    }

    log.error(
      "LOGIN",
      "No account credentials found!"
    );

    process.exit(1);
  }

  log.info(
    "LOGIN",
    `Found ${accountFiles.length} account file(s):`
  );

  accountFiles.forEach(
    file => {
      log.info(
        "  📄",
        path.basename(file)
      );
    }
  );

  for (
    const filePath of accountFiles
  ) {
    const fileName =
      path.basename(
        filePath
      );

    /*
     * Skip accounts that have already
     * failed during current automatic
     * switching cycle.
     */
    if (
      failedAccounts.has(
        fileName
      )
    ) {
      log.warn(
        "LOGIN",
        `Skipping previously failed account: ${fileName}`
      );

      continue;
    }

    log.info(
      "LOGIN",
      `Attempting login with ${fileName}...`
    );

    const spin =
      createOraDots(
        `Loading ${fileName}...`
      );

    spin._start();

    try {
      appState =
        await getAppStateFromFile(
          filePath
        );

      spin._stop();

      if (
        appState &&
        Array.isArray(
          appState
        ) &&
        appState.length > 0
      ) {
        const required = [
          "c_user",
          "xs",
          "datr"
        ];

        const valid =
          required.every(
            key =>
              appState.some(
                item =>
                  item &&
                  item.key === key &&
                  item.value
              )
          );

        if (valid) {
          const accountId =
            getAccountIdFromAppState(
              appState
            );

          saveActiveAccountInfo(
            fileName,
            accountId
          );

          log.success(
            "LOGIN",
            `Successfully loaded ${fileName} (ID: ${accountId})`
          );

          log.info(
            "ACCOUNT",
            `Currently using account: ${fileName}`
          );

          return appState;
        }

        log.warn(
          "LOGIN",
          `${fileName} is invalid or missing required cookies, trying next...`
        );
      } else {
        log.warn(
          "LOGIN",
          `${fileName} is invalid or empty, trying next...`
        );
      }
    } catch (err) {
      spin._stop();

      log.error(
        "LOGIN",
        `Failed with ${fileName}: ${err.message}`
      );
    }
  }

  log.warn(
    "LOGIN",
    "All available account files failed to load."
  );

  if (
    facebookAccount.email &&
    facebookAccount.password
  ) {
    try {
      const spin =
        createOraDots(
          "Logging in with email/password..."
        );

      appState =
        await getAppStateFromEmail(
          spin
        );

      if (
        appState &&
        appState.length > 0
      ) {
        const accountId =
          getAccountIdFromAppState(
            appState
          );

        saveActiveAccountInfo(
          null,
          accountId
        );

        log.success(
          "LOGIN",
          "Successfully logged in with email/password"
        );

        return appState;
      }
    } catch (e) {
      log.error(
        "LOGIN",
        `Email/password login failed: ${e.message}`
      );
    }
  }

  log.error(
    "LOGIN",
    "All login methods failed!"
  );

  process.exit(1);
}

/* =========================================================
 * STOP LISTENER
 * ======================================================= */

function stopListening(
  keyListen
) {
  keyListen =
    keyListen ||
    Object.keys(
      callbackListenTime
    ).pop();

  return new Promise(
    resolve => {
      let resolved = false;

      const done = () => {
        if (resolved) return;

        resolved = true;
        resolve();
      };

      try {
        if (
          global.GoatBot.fcaApi &&
          typeof global.GoatBot
            .fcaApi
            .stopListening ===
            "function"
        ) {
          global.GoatBot.fcaApi.stopListening(
            () => {
              try {
                if (
                  keyListen &&
                  callbackListenTime[
                    keyListen
                  ]
                ) {
                  callbackListenTime[
                    keyListen
                  ] = () => {};
                }
              } catch {}

              done();
            }
          );

          /*
           * Safety timeout.
           * Some FCA versions do not call
           * the stopListening callback.
           */
          setTimeout(
            done,
            5000
          );

          return;
        }
      } catch {}

      done();
    }
  );
}

/* =========================================================
 * GET USER NAME
 * ======================================================= */

async function getName(
  userID
) {
  try {
    const res =
      await axios.post(
        `https://www.facebook.com/api/graphql/?q=node(${userID}){name}`
      );

    return (
      res.data?.[userID]?.name ||
      userID
    );
  } catch {
    return userID;
  }
}

/* =========================================================
 * ERROR NORMALIZATION
 * ======================================================= */

function collectErrorText(
  error,
  output = [],
  depth = 0,
  visited = new Set()
) {
  if (
    error == null ||
    depth > 6
  ) {
    return output;
  }

  if (
    typeof error ===
      "string" ||
    typeof error ===
      "number" ||
    typeof error ===
      "boolean"
  ) {
    output.push(
      String(error)
    );

    return output;
  }

  if (
    typeof error !== "object"
  ) {
    return output;
  }

  if (visited.has(error)) {
    return output;
  }

  visited.add(error);

  try {
    for (
      const key of Object.keys(
        error
      )
    ) {
      try {
        output.push(
          String(key)
        );

        collectErrorText(
          error[key],
          output,
          depth + 1,
          visited
        );
      } catch {}
    }
  } catch {}

  return output;
}

function getErrorText(
  error
) {
  const parts =
    collectErrorText(
      error
    );

  return parts
    .join(" ")
    .toLowerCase()
    .replace(
      /[_-]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

/* =========================================================
 * LOGIN EXPIRED / BLOCKED DETECTOR
 *
 * IMPORTANT FIX:
 * login_blocked was not detected before.
 * ======================================================= */

function isLoginExpired(
  error
) {
  if (!error) {
    return false;
  }

  const text =
    getErrorText(
      error
    );

  if (!text) {
    return false;
  }

  const patterns = [
    "not logged in",
    "not logged in.",
    "login required",

    "session expired",
    "session has expired",

    "invalid session",
    "invalid cookie",
    "cookie expired",
    "cookie is expired",

    "authentication error",
    "authentication failed",
    "authentication",

    /*
     * IMPORTANT
     */
    "login blocked",
    "login_blocked",

    "auth error",
    "auth_error",

    "checkpoint",

    "login error",

    "connection refused server unavailable",

    "account disabled",
    "account suspended"
  ];

  return patterns.some(
    pattern => {
      const normalized =
        pattern
          .toLowerCase()
          .replace(
            /[_-]+/g,
            " "
          );

      return text.includes(
        normalized
      );
    }
  );
}

/* =========================================================
 * CONNECTION CLOSED DETECTOR
 * ======================================================= */

function isConnectionClosed(
  error
) {
  if (!error) {
    return false;
  }

  const text =
    getErrorText(
      error
    );

  return (
    text.includes(
      "connection closed"
    ) ||
    text.includes(
      "connection closed by user"
    )
  );
}

/* =========================================================
 * ACCOUNT FAILURE MARKING
 * ======================================================= */

function markAccountFailed(
  accountFile
) {
  if (!accountFile) {
    return;
  }

  const fileName =
    path.basename(
      accountFile
    );

  failedAccounts.add(
    fileName
  );

  log.warn(
    "ACCOUNT",
    `Marked ${fileName} as failed for this switch cycle.`
  );
}

function markAccountSuccess(
  accountFile
) {
  if (!accountFile) {
    return;
  }

  const fileName =
    path.basename(
      accountFile
    );

  /*
   * Successful account means the
   * automatic switch cycle is complete.
   */
  failedAccounts.clear();

  failedAccounts.delete(
    fileName
  );
}

/* =========================================================
 * GET NEXT ACCOUNT
 * ======================================================= */

function getNextAccountFile(
  failedFile = null
) {
  const files =
    getExistingAccountFiles();

  if (!files.length) {
    return null;
  }

  const currentName =
    failedFile
      ? path.basename(
          failedFile
        )
      : currentAccountFile
        ? path.basename(
            currentAccountFile
          )
        : path.basename(
            getCurrentAccountFile() ||
              ""
          );

  /*
   * First priority:
   * account files which are not current
   * and have not failed.
   */
  const candidates =
    files.filter(file => {
      const name =
        path.basename(
          file
        );

      return (
        name !== currentName &&
        !failedAccounts.has(
          name
        )
      );
    });

  if (
    candidates.length > 0
  ) {
    return candidates[0];
  }

  /*
   * If everything else failed,
   * return null instead of looping forever.
   */
  return null;
}

/* =========================================================
 * SWITCH ACCOUNT
 * ======================================================= */

async function switchToNextAccount(
  failedFile = null
) {
  if (switchingAccount) {
    log.warn(
      "ACCOUNT",
      "Account switch already in progress."
    );

    return false;
  }

  switchingAccount = true;

  try {
    const failedName =
      failedFile
        ? path.basename(
            failedFile
          )
        : currentAccountFile
          ? path.basename(
              currentAccountFile
            )
          : null;

    /*
     * Mark current account failed.
     */
    if (failedName) {
      markAccountFailed(
        failedName
      );
    }

    const nextFile =
      getNextAccountFile(
        failedFile
      );

    /*
     * No other account.
     */
    if (!nextFile) {
      log.error(
        "ACCOUNT",
        "No unused alternate account is available."
      );

      log.warn(
        "ACCOUNT",
        `Failed account(s): ${
          [...failedAccounts].join(
            ", "
          ) || "none"
        }`
      );

      /*
       * Final fallback:
       * email/password
       */
      if (
        facebookAccount.email &&
        facebookAccount.password
      ) {
        log.info(
          "LOGIN",
          "Trying email/password as final fallback..."
        );

        /*
         * Reset cycle before email login.
         */
        failedAccounts.clear();

        await startBot(
          true,
          null
        );

        return true;
      }

      return false;
    }

    const nextName =
      path.basename(
        nextFile
      );

    log.warn(
      "ACCOUNT",
      `${failedName || "Current account"} is no longer usable.`
    );

    log.info(
      "ACCOUNT",
      `Automatically switching to ${nextName}...`
    );

    /*
     * Stop old listener.
     */
    try {
      if (
        global.GoatBot.Listening
      ) {
        await stopListening();
      }
    } catch (err) {
      log.warn(
        "ACCOUNT",
        `Could not stop old listener: ${err.message}`
      );
    }

    global.GoatBot.Listening =
      null;

    /*
     * Clear old runtime account.
     */
    global.GoatBot.fcaApi =
      null;

    global.GoatBot.currentAccountFile =
      null;

    global.GoatBot.currentAccountId =
      null;

    currentAccountFile =
      null;

    currentAccountId =
      null;

    /*
     * Start next account.
     *
     * NOTE:
     * We intentionally do not clear
     * failedAccounts here. If next account
     * also fails, it will be marked and
     * the cycle will stop instead of looping.
     */
    await startBot(
      false,
      nextName
    );

    return true;

  } catch (err) {
    log.error(
      "ACCOUNT",
      `Automatic account switch failed: ${err.message}`
    );

    return false;

  } finally {
    switchingAccount =
      false;
  }
}

/* =========================================================
 * START BOT
 * ======================================================= */

async function startBot(
  loginWithEmail = false,
  preferredFile = null
) {
  console.log(
    colors.hex("#f5ab00")(
      createLine(
        "START LOGGING IN",
        true
      )
    )
  );

  const botVersion =
    require(
      "../../package.json"
    ).version;

  let tooOldVersion =
    "0.0.0";

  try {
    const res =
      await axios.get(
        "https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Storage/main/tooOldVersions.txt",
        {
          timeout: 15000
        }
      );

    tooOldVersion =
      res.data ||
      "0.0.0";
  } catch {}

  if (
    compareVersion(
      botVersion,
      tooOldVersion
    ) <= 0
  ) {
    log.err(
      "VERSION",
      getText(
        "version",
        "tooOldVersion",
        colors.yellowBright(
          "node update"
        )
      )
    );

    process.exit(1);
  }

  /*
   * Stop existing listener before
   * starting another account.
   */
  if (
    global.GoatBot.Listening
  ) {
    await stopListening();
  }

  global.GoatBot.Listening =
    null;

  log.info(
    "LOGIN FACEBOOK",
    getText(
      "login",
      "currentlyLogged"
    )
  );

  const requestedFile =
    preferredFile ||
    getCurrentAccountFile();

  let appState =
    await getAppStateToLogin(
      loginWithEmail,
      requestedFile
    );

  if (
    !Array.isArray(appState) ||
    appState.length === 0
  ) {
    throw new Error(
      "No valid appState returned."
    );
  }

  const accountId =
    getAccountIdFromAppState(
      appState
    );

  appState =
    filterKeysAppState(
      appState
    );

  /*
   * IMPORTANT:
   *
   * If preferredFile exists, use it.
   * Do not accidentally use stale
   * currentAccountFile from previous session.
   */
  const actualFile =
    loginWithEmail
      ? null
      : preferredFile ||
        currentAccountFile ||
        requestedFile ||
        null;

  saveActiveAccountInfo(
    actualFile,
    accountId
  );

  log.info(
    "ACCOUNT",
    `Currently using account: ${
      actualFile ||
      "email/password"
    }`
  );

  log.info(
    "ACCOUNT",
    `Logged in with ID: ${accountId}`
  );

  let changeFbStateByCode =
    true;

  setTimeout(() => {
    changeFbStateByCode =
      false;
  }, 1500);

  /*
   * Login callback is asynchronous.
   * Use a session ID so an old account
   * callback cannot overwrite a new one.
   */
  const sessionId =
    `${Date.now()}_${randomString(8)}`;

  global.GoatBot.loginSessionId =
    sessionId;

  (function loginBot(
    appState,
    accountFile,
    currentSessionId
  ) {
    /*
     * Reset command maps.
     */
    global.GoatBot.commands =
      new Map();

    global.GoatBot.eventCommands =
      new Map();

    global.GoatBot.aliases =
      new Map();

    global.GoatBot.onChat =
      [];

    global.GoatBot.onEvent =
      [];

    global.GoatBot.onReply =
      new Map();

    global.GoatBot.onReaction =
      new Map();

    /*
     * Clear old restart timer.
     */
    clearInterval(
      global.intervalRestartListenMqtt
    );

    delete global.intervalRestartListenMqtt;

    /*
     * i_user support.
     */
    if (
      facebookAccount.i_user
    ) {
      /*
       * Avoid duplicate i_user.
       */
      const already =
        appState.some(
          item =>
            item &&
            item.key ===
              "i_user"
        );

      if (!already) {
        appState.push({
          key: "i_user",

          value:
            facebookAccount.i_user,

          domain:
            "facebook.com",

          path: "/",

          hostOnly: false,

          creation:
            new Date().toISOString(),

          lastAccessed:
            new Date().toISOString()
        });
      }
    }

    login(
      {
        appState
      },

      global.GoatBot.config
        .optionsFca || {},

      async function(
        error,
        api
      ) {
        /*
         * -------------------------------------------------
         * LOGIN ERROR
         * -------------------------------------------------
         */

        if (error) {
          global.statusAccountBot =
            "can't login";

          log.err(
            "LOGIN FACEBOOK",
            getText(
              "login",
              "loginError"
            ),
            error
          );

          const errorText =
            getErrorText(
              error
            );

          log.err(
            "LOGIN FACEBOOK",
            `Detected error: ${errorText || "unknown"}`
          );

          /*
           * IMPORTANT:
           * Detect login_blocked,
           * auth_error, session expired,
           * checkpoint etc.
           */
          const expired =
            isLoginExpired(
              error
            );

          if (
            expired &&
            accountFile &&
            !loginWithEmail
          ) {
            markAccountFailed(
              accountFile
            );

            /*
             * Avoid duplicate switch.
             */
            if (
              reloginTimer
            ) {
              return;
            }

            log.err(
              "ACCOUNT",
              `Session/authentication failure detected for ${accountFile}.`
            );

            reloginTimer =
              setTimeout(
                async () => {
                  reloginTimer =
                    null;

                  await switchToNextAccount(
                    accountFile
                  );
                },
                1000
              );

            return;
          }

          /*
           * Login failed with email/password.
           * Do not try account files again
           * from this callback.
           */
          if (
            loginWithEmail
          ) {
            log.err(
              "LOGIN",
              "Email/password login failed."
            );

            process.exit(1);

            return;
          }

          /*
           * If an account file was being used,
           * switch to next account.
           */
          if (
            accountFile
          ) {
            markAccountFailed(
              accountFile
            );

            if (
              !switchingAccount
            ) {
              await switchToNextAccount(
                accountFile
              );
            }

            return;
          }

          /*
           * Final email/password fallback.
           */
          if (
            facebookAccount.email &&
            facebookAccount.password
          ) {
            log.info(
              "LOGIN",
              "Retrying with email/password..."
            );

            await startBot(
              true,
              null
            );

            return;
          }

          process.exit(1);

          return;
        }

        /*
         * -------------------------------------------------
         * OLD SESSION GUARD
         * -------------------------------------------------
         *
         * If an old account callback arrives after
         * account switching already started, ignore it.
         */
        if (
          global.GoatBot.loginSessionId !==
          currentSessionId
        ) {
          log.warn(
            "ACCOUNT",
            "Ignoring callback from an old login session."
          );

          try {
            if (
              api &&
              typeof api.logout ===
                "function"
            ) {
              api.logout();
            }
          } catch {}

          return;
        }

        /*
         * -------------------------------------------------
         * LOGIN SUCCESS
         * -------------------------------------------------
         */

        global.GoatBot.fcaApi =
          api;

        global.GoatBot.botID =
          api.getCurrentUserID();

        global.botID =
          global.GoatBot.botID;

        /*
         * Successful account:
         * clear failed account cycle.
         */
        markAccountSuccess(
          accountFile
        );

        saveActiveAccountInfo(
          accountFile,
          global.GoatBot.botID
        );

        log.info(
          "LOGIN FACEBOOK",
          getText(
            "login",
            "loginSuccess"
          )
        );

        logColor(
          "#f5ab00",
          createLine(
            "BOT INFO"
          )
        );

        log.info(
          "NODE VERSION",
          process.version
        );

        log.info(
          "PROJECT VERSION",
          botVersion
        );

        log.info(
          "BOT ID",
          `${global.botID} - ${await getName(
            global.botID
          )}`
        );

        log.info(
          "ACCOUNT",
          `Currently using account: ${
            accountFile ||
            "email/password"
          }`
        );

        log.info(
          "PREFIX",
          global.GoatBot.config
            .prefix
        );

        log.info(
          "LANGUAGE",
          global.GoatBot.config
            .language
        );

        log.info(
          "BOT NICK NAME",
          global.GoatBot.config
            .nickNameBot ||
            "GOAT BOT"
        );

        /*
         * -------------------------------------------------
         * LOAD DATABASE
         * -------------------------------------------------
         */

        const {
          threadModel,
          userModel,
          dashBoardModel,
          globalModel,
          threadsData,
          usersData,
          dashBoardData,
          globalData
        } =
          await require(
            process.env.NODE_ENV ===
              "development"
              ? "./loadData.dev.js"
              : "./loadData.js"
          )(
            api,
            createLine
          );

        /*
         * -------------------------------------------------
         * CUSTOM
         * -------------------------------------------------
         */

        await require(
          "../custom.js"
        )({
          api,
          threadModel,
          userModel,
          dashBoardModel,
          globalModel,
          threadsData,
          usersData,
          dashBoardData,
          globalData,
          getText
        });

        /*
         * -------------------------------------------------
         * LOAD SCRIPTS
         * -------------------------------------------------
         */

        await require(
          process.env.NODE_ENV ===
            "development"
            ? "./loadScripts.dev.js"
            : "./loadScripts.js"
        )(
          api,
          threadModel,
          userModel,
          dashBoardModel,
          globalModel,
          threadsData,
          usersData,
          dashBoardData,
          globalData,
          createLine
        );

        /*
         * -------------------------------------------------
         * HANDLER
         * -------------------------------------------------
         */

        const handlerAction =
          require(
            "../handler/handlerAction.js"
          )(
            api,
            threadModel,
            userModel,
            dashBoardModel,
            globalModel,
            usersData,
            threadsData,
            dashBoardData,
            globalData
          );

        /*
         * -------------------------------------------------
         * LISTENER CALLBACK
         * -------------------------------------------------
         */

        async function callBackListen(
          error,
          event
        ) {
          /*
           * Ignore events from an old session.
           */
          if (
            global.GoatBot.loginSessionId !==
            currentSessionId
          ) {
            return;
          }

          /*
           * -----------------------------------------------
           * LISTENER ERROR
           * -----------------------------------------------
           */

          if (error) {
            global.responseUptimeCurrent =
              global.responseUptimeError;

            global.statusAccountBot =
              "can't login";

            const errorText =
              getErrorText(
                error
              );

            log.err(
              "LISTEN_MQTT",
              `Error: ${errorText || String(error)}`
            );

            /*
             * =============================================
             * LOGIN EXPIRED / BLOCKED
             * =============================================
             */
            if (
              isLoginExpired(
                error
              )
            ) {
              log.err(
                "ACCOUNT",
                `Authentication/session failure detected: ${
                  accountFile ||
                  "current account"
                }`
              );

              /*
               * IMPORTANT:
               * This catches:
               *
               * login_blocked
               * auth_error
               * auth error
               * session expired
               * checkpoint
               */
              if (
                accountFile &&
                !loginWithEmail
              ) {
                markAccountFailed(
                  accountFile
                );

                if (
                  reloginTimer
                ) {
                  return;
                }

                reloginTimer =
                  setTimeout(
                    async () => {
                      reloginTimer =
                        null;

                      try {
                        await switchToNextAccount(
                          accountFile
                        );
                      } catch (
                        switchError
                      ) {
                        log.error(
                          "ACCOUNT",
                          `Switch error: ${switchError.message}`
                        );
                      }
                    },
                    1000
                  );

                return;
              }

              /*
               * Email/password session failed.
               */
              if (
                loginWithEmail
              ) {
                log.err(
                  "LOGIN",
                  "Email/password session is no longer valid."
                );

                process.exit(1);

                return;
              }
            }

            /*
             * =============================================
             * NOT LOGGED IN
             * =============================================
             */

            if (
              error?.error ===
                "Not logged in" ||
              error?.error ===
                "Not logged in." ||
              error?.error ===
                "Connection refused: Server unavailable"
            ) {
              log.err(
                "LISTEN_MQTT",
                getText(
                  "login",
                  "notLoggedIn"
                ),
                error
              );

              if (
                accountFile &&
                !loginWithEmail
              ) {
                markAccountFailed(
                  accountFile
                );

                if (
                  !switchingAccount
                ) {
                  await switchToNextAccount(
                    accountFile
                  );
                }

                return;
              }

              if (
                global.GoatBot
                  .config
                  .autoRestartWhenListenMqttError
              ) {
                process.exit(2);
              }

              return;
            }

            /*
             * =============================================
             * CONNECTION CLOSED
             * =============================================
             *
             * Normal MQTT disconnect should not instantly
             * switch accounts unless FCA reports an auth
             * error such as login_blocked.
             */

            if (
              isConnectionClosed(
                error
              )
            ) {
              log.warn(
                "LISTEN_MQTT",
                "MQTT connection closed."
              );

              return;
            }

            /*
             * Other listener errors.
             */
            await handlerWhenListenHasError(
              {
                api,
                threadModel,
                userModel,
                dashBoardModel,
                globalModel,
                threadsData,
                usersData,
                dashBoardData,
                globalData,
                error
              }
            );

            return;
          }

          /*
           * -----------------------------------------------
           * NORMAL EVENT
           * -----------------------------------------------
           */

          global.responseUptimeCurrent =
            global.responseUptimeSuccess;

          global.statusAccountBot =
            "good";

          if (!event) {
            return;
          }

          const configLog =
            global.GoatBot.config
              .logEvents;

          if (
            configLog.disableAll ===
              false &&
            configLog[
              event.type
            ] !== false
          ) {
            const participantIDs_ =
              [
                ...(event.participantIDs ||
                  [])
              ];

            if (
              event.participantIDs
            ) {
              event.participantIDs =
                "Array(" +
                event.participantIDs
                  .length +
                ")";
            }

            console.log(
              colors.green(
                (
                  event.type ||
                  ""
                ).toUpperCase() +
                  ":"
              ),
              jsonStringifyColor(
                event,
                null,
                2
              )
            );

            if (
              event.participantIDs
            ) {
              event.participantIDs =
                participantIDs_;
            }
          }

          /*
           * -----------------------------------------------
           * WHITE LIST
           * -----------------------------------------------
           */

          if (
            global.GoatBot.config
              .whiteListMode
              ?.enable === true &&
            !global.GoatBot.config
              .adminBot.includes(
                event.senderID
              ) &&
            !global.GoatBot.config
              .whiteListMode
              .whiteListIds.includes(
                event.senderID
              )
          ) {
            return;
          }

          /*
           * -----------------------------------------------
           * THREAD WHITE LIST
           * -----------------------------------------------
           */

          if (
            global.GoatBot.config
              .whiteListModeThread
              ?.enable === true &&
            !global.GoatBot.config
              .adminBot.includes(
                event.senderID
              ) &&
            !global.GoatBot.config
              .whiteListModeThread
              .whiteListThreadIds.includes(
                event.threadID
              )
          ) {
            return;
          }

          /*
           * -----------------------------------------------
           * DUPLICATE MESSAGE CONTROL
           * -----------------------------------------------
           */

          if (
            event.messageID &&
            event.type ===
              "message"
          ) {
            if (
              storage5Message.includes(
                event.messageID
              )
            ) {
              Object.keys(
                callbackListenTime
              )
                .slice(0, -1)
                .forEach(
                  key => {
                    callbackListenTime[
                      key
                    ] = () => {};
                  }
                );
            } else {
              storage5Message.push(
                event.messageID
              );

              if (
                storage5Message.length >
                5
              ) {
                storage5Message.shift();
              }
            }
          }

          /*
           * -----------------------------------------------
           * ACTION HANDLER
           * -----------------------------------------------
           */

          try {
            handlerAction(
              event
            );
          } catch (err) {
            log.error(
              "HANDLER",
              `handlerAction error: ${err.message}`
            );
          }
        }

        /*
         * -------------------------------------------------
         * CALLBACK WRAPPER
         * -------------------------------------------------
         */

        function createCallBackListen(
          key
        ) {
          key =
            randomString(10) +
            (key ||
              Date.now());

          callbackListenTime[
            key
          ] =
            callBackListen;

          return function(
            error,
            event
          ) {
            /*
             * Protect against callbacks
             * after account switching.
             */
            if (
              global.GoatBot.loginSessionId !==
              currentSessionId
            ) {
              return;
            }

            try {
              const callback =
                callbackListenTime[
                  key
                ];

              if (
                typeof callback ===
                "function"
              ) {
                callback(
                  error,
                  event
                );
              }
            } catch (
              callbackError
            ) {
              log.error(
                "LISTEN_MQTT",
                `Callback error: ${callbackError.message}`
              );
            }
          };
        }

        /*
         * -------------------------------------------------
         * START MQTT
         * -------------------------------------------------
         */

        try {
          await stopListening();

          /*
           * Make sure old listener is gone.
           */
          global.GoatBot.Listening =
            null;

          /*
           * Re-check session before creating listener.
           */
          if (
            global.GoatBot.loginSessionId !==
            currentSessionId
          ) {
            return;
          }

          global.GoatBot.Listening =
            api.listenMqtt(
              createCallBackListen()
            );

          global.GoatBot.callBackListen =
            callBackListen;

          log.info(
            "LOGIN FACEBOOK",
            "MQTT listener started successfully."
          );

          /*
           * Auto uptime.
           */
          require(
            "../autoUptime.js"
          );

        } catch (err) {
          log.error(
            "LISTEN_MQTT",
            `Failed to start MQTT listener: ${err.message}`
          );

          /*
           * If listener itself reports an authentication
           * problem, automatically switch.
           */
          if (
            isLoginExpired(
              err
            ) &&
            accountFile &&
            !loginWithEmail
          ) {
            markAccountFailed(
              accountFile
            );

            if (
              !switchingAccount
            ) {
              await switchToNextAccount(
                accountFile
              );
            }

            return;
          }

          throw err;
        }
      }
    );
  })(

    appState,

    actualFile,

    sessionId

  );

  /*
   * Set current account immediately.
   */
  global.GoatBot.currentAccountFile =
    actualFile;

  global.GoatBot.currentAccountId =
    accountId;

  return true;
}

/* =========================================================
 * PUBLIC RELOGIN
 * ======================================================= */

global.GoatBot.reLoginBot =
  async function(
    fileName = null
  ) {
    if (
      switchingAccount
    ) {
      log.warn(
        "ACCOUNT",
        "Cannot relogin while account switch is already running."
      );

      return;
    }

    /*
     * Reset failed accounts for manual
     * relogin.
     */
    failedAccounts.clear();

    if (
      fileName &&
      ACCOUNT_FILES.includes(
        fileName
      )
    ) {
      await startBot(
        false,
        fileName
      );

      return;
    }

    await startBot(
      false,
      getCurrentAccountFile()
    );
  };

/* =========================================================
 * MANUAL ACCOUNT SWITCH
 * ======================================================= */

global.GoatBot.switchAccount =
  async function(
    accountNumber
  ) {
    const fileName =
      accountNumber === 2
        ? "account2.txt"
        : "account.txt";

    const filePath =
      getAccountPath(
        fileName
      );

    if (
      !filePath ||
      !existsSync(filePath)
    ) {
      throw new Error(
        `${fileName} does not exist`
      );
    }

    /*
     * Manual switch starts a fresh cycle.
     */
    failedAccounts.clear();

    if (
      global.GoatBot.Listening
    ) {
      await stopListening();
    }

    global.GoatBot.Listening =
      null;

    await startBot(
      false,
      fileName
    );
  };

/* =========================================================
 * CURRENT ACCOUNT API
 * ======================================================= */

global.GoatBot.getCurrentAccount =
  function() {
    const file =
      getCurrentAccountFile();

    return {
      file,

      account:
        file ===
        "account2.txt"
          ? 2
          : file ===
            "account.txt"
            ? 1
            : null,

      accountId:
        currentAccountId ||
        readActiveAccountInfo()
          ?.accountId ||
        null
    };
  };

/* =========================================================
 * PROCESS EXIT
 * ======================================================= */

process.on(
  "exit",
  code => {
    if (code === 2) {
      setTimeout(
        () => {
          require(
            "child_process"
          ).fork(
            process.argv[1],
            process.argv.slice(
              2
            ),
            {
              env:
                process.env,
              stdio:
                "inherit"
            }
          );
        },
        1500
      );
    }
  }
);

/* =========================================================
 * GLOBAL ERROR PROTECTION
 * ======================================================= */

process.on(
  "unhandledRejection",
  async err => {
    try {
      log.error(
        "LOGIN",
        `Unhandled rejection: ${
          err?.message ||
          String(err)
        }`
      );
    } catch {}
  }
);

/* =========================================================
 * START
 * ======================================================= */

startBot().catch(
  err => {
    try {
      log.error(
        "FATAL",
        "Unhandled error in startBot:",
        err
      );
    } catch {
      console.error(
        "FATAL:",
        err
      );
    }

    process.exit(1);
  }
);
