const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── تبدیل تاریخ میلادی به شمسی ───────────────────────────────────────────
function toJalali(gy, gm, gd) {
  const g_d_no = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy = gy <= 1600 ? gy - 621 : gy - 1600;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_no[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

// ─── اسامی فارسی ────────────────────────────────────────────────────────────
const jalaliMonths = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر",     "مرداد",    "شهریور",
  "مهر",     "آبان",     "آذر",
  "دی",      "بهمن",     "اسفند",
];

const jalaliDays = [
  "شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه",
];

// نام برج‌ها (بر اساس ماه شمسی)
const zodiacSigns = [
  { name: "♈ حَمَل (بره)",      emoji: "♈" },
  { name: "♉ ثَور (گاو)",       emoji: "♉" },
  { name: "♊ جَوزا (دوپیکر)",   emoji: "♊" },
  { name: "♋ سَرَطان (خرچنگ)", emoji: "♋" },
  { name: "♌ اَسَد (شیر)",      emoji: "♌" },
  { name: "♍ سُنبُله (خوشه)",  emoji: "♍" },
  { name: "♎ میزان (ترازو)",    emoji: "♎" },
  { name: "♏ عَقرَب (کژدم)",   emoji: "♏" },
  { name: "♐ قَوس (کمان)",      emoji: "♐" },
  { name: "♑ جَدی (بز)",        emoji: "♑" },
  { name: "♒ دَلو (دلو)",       emoji: "♒" },
  { name: "♓ حوت (ماهی)",       emoji: "♓" },
];

// فصل‌ها
function getSeason(jm) {
  if (jm <= 3)  return "🌸 بهار";
  if (jm <= 6)  return "☀️ تابستان";
  if (jm <= 9)  return "🍂 پاییز";
  return "❄️ زمستان";
}

// اعداد فارسی
function toPersianNum(n) {
  return String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

// روز هفته فارسی
function getPersianWeekday(date) {
  const day = date.getDay(); // 0=Sun
  // تبدیل: شنبه=6، یک‌شنبه=0، ...
  const map = [1, 2, 3, 4, 5, 6, 0];
  return jalaliDays[map[day]];
}

// ─── هندلر کامند ────────────────────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();
  if (content !== "/calender" && content !== "/calendar") return;

  const now = new Date();
  const { jy, jm, jd } = toJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  const monthName  = jalaliMonths[jm - 1];
  const zodiac     = zodiacSigns[jm - 1];
  const season     = getSeason(jm);
  const weekday    = getPersianWeekday(now);

  // ساعت به وقت تهران (UTC+3:30)
  const tehranOffset = 3.5 * 60;
  const tehranTime = new Date(now.getTime() + (tehranOffset - (-now.getTimezoneOffset())) * 60000);
  const hours   = String(tehranTime.getHours()).padStart(2, "0");
  const minutes = String(tehranTime.getMinutes()).padStart(2, "0");

  const embed = new EmbedBuilder()
    .setColor(0x2f6b3f)
    .setTitle("📅  تقویم شمسی")
    .setDescription(
      `> **${weekday}، ${toPersianNum(jd)} ${monthName} ${toPersianNum(jy)}**`
    )
    .addFields(
      {
        name: "📆 تاریخ کامل",
        value: `\`${toPersianNum(jy)}/${String(jm).padStart(2,"0")}/${String(jd).padStart(2,"0")}\``,
        inline: true,
      },
      {
        name: "🕰️ ساعت (تهران)",
        value: `\`${hours}:${minutes}\``,
        inline: true,
      },
      {
        name: "🌿 فصل",
        value: season,
        inline: true,
      },
      {
        name: "⭐ برج ماه",
        value: zodiac.name,
        inline: true,
      },
      {
        name: "📖 ماه شمسی",
        value: `ماه **${monthName}** — ماه ${toPersianNum(jm)}ام سال`,
        inline: true,
      },
      {
        name: "🗓️ روز سال",
        value: `روز **${toPersianNum(getDayOfYear(jm, jd))}** از ۳۶۵`,
        inline: true,
      }
    )
    .setFooter({ text: "تقویم جلالی • Jalali Calendar" })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
});

function getDayOfYear(jm, jd) {
  let days = jd;
  for (let i = 1; i < jm; i++) {
    days += i <= 6 ? 31 : 30;
  }
  return days;
}

// ─── ورود ربات ──────────────────────────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅ ربات آنلاین شد: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);