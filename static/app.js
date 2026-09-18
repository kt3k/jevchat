/* jevchat client — talks to /api/chat, keeps history in localStorage. */
"use strict";

/* ---------------------------------- i18n ---------------------------------- */

const I18N = {
  en: {
    demo: "demo",
    newChat: "New chat",
    language: "Language",
    untitled: "New chat",
    answerStyle: "Answer style",
    emptyTitle: "Ask Jev anything",
    emptySubtitle:
      "Jev is a System One model by TypeSafe AI. It never writes essays — it just decides. By default: Yes or No.",
    inputPlaceholder: "Ask a yes/no question…",
    send: "Send",
    disclaimer:
      "Jev answers with calibrated probabilities, not words. History is stored locally in your browser (max 10 chats).",
    customTitle: "Create a custom answer style",
    customSubtitle: "Give Jev your own set of answers to choose from.",
    customName: "Style name",
    customOptions: "Answers (one per line, 2–8)",
    customHint:
      "Optionally add “ | hint” after an answer to tell Jev when to pick it.",
    cancel: "Cancel",
    save: "Save",
    createCustom: "＋ Create your own…",
    builtinGroup: "Built-in",
    customGroup: "Custom",
    thinking: "Jev is deciding",
    yesProb: (pct) => `yes-probability: ${pct}%`,
    confidence: (pct) => `confidence: ${pct}%`,
    errorAnswer: "Jev is speechless right now (API error). Try again.",
    deleteChat: "Delete chat",
    customNameError: "Please enter a style name.",
    customOptionsError: "Please enter between 2 and 8 answers.",
    percentYes: (pct) => `${pct}% YES`,
    suggestions: [
      "Is a hot dog a sandwich?",
      "Should I deploy on Friday?",
      "Do aliens exist?",
      "Is it okay to put pineapple on pizza?",
    ],
    fallbackTitles: [
      "The Great Unknown",
      "A Question for the Ages",
      "Untitled Dilemma",
      "Cosmic Coin Flip",
      "Big If True",
      "The Oracle Shrugged",
    ],
  },
  ja: {
    demo: "デモ",
    newChat: "新しいチャット",
    language: "言語",
    untitled: "新しいチャット",
    answerStyle: "回答スタイル",
    emptyTitle: "Jev に何でも聞いてみよう",
    emptySubtitle:
      "Jev は TypeSafe AI の System One モデル。長文は書かず、ただ決断するだけ。デフォルトの答えは Yes か No。",
    inputPlaceholder: "Yes/No で答えられる質問をどうぞ…",
    send: "送信",
    disclaimer:
      "Jev は言葉ではなく較正された確率で答えます。履歴はブラウザ内 (localStorage) に最大10件保存されます。",
    customTitle: "カスタム回答スタイルを作る",
    customSubtitle: "Jev に選ばせたい答えを自由に設定できます。",
    customName: "スタイル名",
    customOptions: "答えの選択肢 (1行に1つ、2〜8個)",
    customHint:
      "「答え | ヒント」の形式で、Jev がその答えを選ぶ条件を添えられます。",
    cancel: "キャンセル",
    save: "保存",
    createCustom: "＋ 自分で作る…",
    builtinGroup: "標準",
    customGroup: "カスタム",
    thinking: "Jev、判断中",
    yesProb: (pct) => `イエス確率: ${pct}%`,
    confidence: (pct) => `確信度: ${pct}%`,
    errorAnswer:
      "Jev は今、言葉を失っています (APIエラー)。もう一度試してください。",
    deleteChat: "チャットを削除",
    customNameError: "スタイル名を入力してください。",
    customOptionsError: "答えは2〜8個で入力してください。",
    percentYes: (pct) => `イエス率 ${pct}%`,
    suggestions: [
      "きのこの山はたけのこの里より美味しい?",
      "金曜日にデプロイしてもいい?",
      "宇宙人はいる?",
      "明日の会議、休んでもいい?",
    ],
    fallbackTitles: [
      "名もなき問い",
      "究極の二択",
      "運命のコイントス",
      "宇宙のYES/NO",
      "答えは風の中",
      "賢者の沈黙",
    ],
  },
};

/* ------------------------------ answer modes ------------------------------ */
// Built-in binary modes use Jev's noul (yes-probability). Each band is
// [minProbability, {en, ja}, tone]; the first band whose min <= p wins.
// tone: yes | no | meh (drives color).

const BUILTIN_MODES = [
  {
    id: "classic",
    name: { en: "Yes / No (classic Jev)", ja: "Yes / No (Jev標準)" },
    kind: "noul",
    bands: [
      [0.5, { en: "Yes.", ja: "はい。" }, "yes"],
      [0, { en: "No.", ja: "いいえ。" }, "no"],
    ],
  },
  {
    id: "maybe",
    name: { en: "Yes / No / Maybe", ja: "Yes / No / Maybe" },
    kind: "noul",
    bands: [
      [0.65, { en: "Yes.", ja: "はい。" }, "yes"],
      [0.35, { en: "Maybe.", ja: "たぶん。" }, "meh"],
      [0, { en: "No.", ja: "いいえ。" }, "no"],
    ],
  },
  {
    id: "honest",
    name: { en: "Yes / No / I don't know", ja: "Yes / No / わからない" },
    kind: "noul",
    bands: [
      [0.65, { en: "Yes.", ja: "はい。" }, "yes"],
      [0.35, { en: "I don't know.", ja: "わからない。" }, "meh"],
      [0, { en: "No.", ja: "いいえ。" }, "no"],
    ],
  },
  {
    id: "magic8",
    name: { en: "Magic 8-Ball", ja: "マジック8ボール" },
    kind: "noul",
    bands: [
      [0.97, { en: "It is certain.", ja: "間違いない。" }, "yes"],
      [0.9, { en: "Without a doubt.", ja: "疑いの余地なし。" }, "yes"],
      [0.75, { en: "Signs point to yes.", ja: "イエスの気配。" }, "yes"],
      [0.6, { en: "Most likely.", ja: "たぶんね。" }, "yes"],
      [0.45, { en: "Ask again later.", ja: "また後で聞いて。" }, "meh"],
      [0.3, { en: "Don't count on it.", ja: "期待しないで。" }, "no"],
      [0.1, { en: "My reply is no.", ja: "答えはノー。" }, "no"],
      [0, { en: "Very doubtful.", ja: "かなり怪しい。" }, "no"],
    ],
  },
  {
    id: "vibe",
    name: { en: "Vibe check", ja: "テンション高め" },
    kind: "noul",
    bands: [
      [0.9, { en: "ABSOLUTELY!!!", ja: "もちろん!!!" }, "yes"],
      [0.65, { en: "yeah, sure", ja: "うん、いいんじゃない" }, "yes"],
      [0.45, { en: "meh.", ja: "びみょう。" }, "meh"],
      [0.2, { en: "nah", ja: "ないね" }, "no"],
      [0, { en: "ABSOLUTELY NOT.", ja: "絶対にない!!!" }, "no"],
    ],
  },
  {
    id: "cat",
    name: { en: "Cat", ja: "猫" },
    kind: "noul",
    bands: [
      [0.6, { en: "Meow! ᓚᘏᗢ  (yes)", ja: "ニャー！ᓚᘏᗢ (はい)" }, "yes"],
      [0.4, { en: "…purr? (who knows)", ja: "…ゴロゴロ？(さあ)" }, "meh"],
      [0, { en: "HISSSS. (no)", ja: "シャーッ！(いいえ)" }, "no"],
    ],
  },
  {
    id: "samurai",
    name: { en: "Samurai", ja: "武士" },
    kind: "noul",
    bands: [
      [0.6, { en: "So be it.", ja: "よかろう。" }, "yes"],
      [0.4, { en: "The path is unclear.", ja: "委細、不明なり。" }, "meh"],
      [0, { en: "It shall not pass.", ja: "ならぬ。" }, "no"],
    ],
  },
  {
    id: "pirate",
    name: { en: "Pirate", ja: "海賊" },
    kind: "noul",
    bands: [
      [0.6, { en: "Aye, cap'n! ☠️", ja: "アイアイサー！☠️" }, "yes"],
      [
        0.4,
        { en: "Arr… the sea be foggy.", ja: "うーむ、海霧で見えぬ…" },
        "meh",
      ],
      [0, { en: "Nay!", ja: "ノーじゃ！" }, "no"],
    ],
  },
  {
    id: "percent",
    name: { en: "Just the numbers", ja: "確率そのまま" },
    kind: "noul",
    bands: null, // rendered as raw percentage
  },
];

/* --------------------------------- storage -------------------------------- */

const LS = {
  chats: "jevchat.chats",
  lang: "jevchat.lang",
  mode: "jevchat.mode",
  customModes: "jevchat.customModes",
};
const MAX_CHATS = 10;
const MAX_CONTEXT_TURNS = 6;

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or blocked — demo, ignore */ }
}

/* ---------------------------------- state --------------------------------- */

let lang = loadJSON(LS.lang, null) ||
  ((navigator.languages || [navigator.language || "en"])
      .some((l) => String(l).toLowerCase().startsWith("ja"))
    ? "ja"
    : "en");
let chats = loadJSON(LS.chats, []);
const customModes = loadJSON(LS.customModes, []);
let currentModeId = loadJSON(LS.mode, "classic");
let currentChatId = null;
let pending = false;

const $ = (sel) => document.querySelector(sel);
const t = (key) => I18N[lang][key] ?? I18N.en[key] ?? key;

function allModes() {
  return [...BUILTIN_MODES, ...customModes];
}
function findMode(id) {
  return allModes().find((m) => m.id === id) || BUILTIN_MODES[0];
}
function modeName(mode) {
  return typeof mode.name === "string"
    ? mode.name
    : (mode.name[lang] || mode.name.en);
}
function currentChat() {
  return chats.find((c) => c.id === currentChatId) || null;
}

/* -------------------------------- rendering ------------------------------- */

function applyI18n() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }
  $("#lang-select").value = lang;
  renderModeSelect();
  renderSuggestions();
  renderHistory();
  renderMessages();
}

function renderModeSelect() {
  const sel = $("#mode-select");
  sel.innerHTML = "";
  const gBuiltin = document.createElement("optgroup");
  gBuiltin.label = t("builtinGroup");
  for (const m of BUILTIN_MODES) {
    const o = document.createElement("option");
    o.value = m.id;
    o.textContent = modeName(m);
    gBuiltin.appendChild(o);
  }
  sel.appendChild(gBuiltin);
  if (customModes.length > 0) {
    const gCustom = document.createElement("optgroup");
    gCustom.label = t("customGroup");
    for (const m of customModes) {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = modeName(m);
      gCustom.appendChild(o);
    }
    sel.appendChild(gCustom);
  }
  const oNew = document.createElement("option");
  oNew.value = "__create__";
  oNew.textContent = t("createCustom");
  sel.appendChild(oNew);
  sel.value = findMode(currentModeId).id;
}

function renderSuggestions() {
  const box = $("#suggestions");
  box.innerHTML = "";
  for (const s of I18N[lang].suggestions) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.dataset.variant = "outline";
    b.dataset.size = "sm";
    b.textContent = s;
    b.addEventListener("click", () => {
      $("#chat-input").value = s;
      $("#chat-input").focus();
    });
    box.appendChild(b);
  }
}

function renderHistory() {
  const nav = $("#history");
  nav.innerHTML = "";
  for (const chat of chats) {
    const row = document.createElement("div");
    row.className =
      "group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer text-sm hover:bg-accent " +
      (chat.id === currentChatId ? "bg-accent font-medium" : "");
    const title = document.createElement("span");
    title.className = "flex-1 truncate";
    title.textContent = chat.title || t("untitled");
    row.appendChild(title);
    const del = document.createElement("button");
    del.className =
      "btn opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0";
    del.dataset.variant = "ghost";
    del.dataset.size = "icon-xs";
    del.textContent = "🗑";
    del.title = t("deleteChat");
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      chats = chats.filter((c) => c.id !== chat.id);
      if (currentChatId === chat.id) currentChatId = null;
      saveJSON(LS.chats, chats);
      renderHistory();
      renderMessages();
      renderTitle();
    });
    row.appendChild(del);
    row.addEventListener("click", () => {
      currentChatId = chat.id;
      if (chat.modeId && allModes().some((m) => m.id === chat.modeId)) {
        currentModeId = chat.modeId;
        $("#mode-select").value = currentModeId;
      }
      renderHistory();
      renderMessages();
      renderTitle();
      closeSidebar();
    });
    nav.appendChild(row);
  }
}

function renderTitle() {
  const chat = currentChat();
  $("#chat-title").textContent = chat?.title || t("untitled");
}

const TONE_CLASSES = {
  yes: "text-green-600 dark:text-green-400",
  no: "text-red-600 dark:text-red-400",
  meh: "text-amber-600 dark:text-amber-400",
};

function answerDisplay(msg) {
  // Returns {label, tone, detail} computed from stored raw result + current lang.
  if (msg.error) return { label: t("errorAnswer"), tone: "meh", detail: null };
  const mode = findMode(msg.modeId);
  if (msg.result.kind === "noul") {
    const p = msg.result.p;
    const pct = Math.round(p * 100);
    if (mode.id === "percent" || !mode.bands) {
      return {
        label: I18N[lang].percentYes(pct),
        tone: p >= 0.5 ? "yes" : "no",
        detail: { p },
      };
    }
    for (const [min, label, tone] of mode.bands) {
      if (p >= min) {
        return { label: label[lang] || label.en, tone, detail: { p } };
      }
    }
    const last = mode.bands[mode.bands.length - 1];
    return { label: last[1][lang] || last[1].en, tone: last[2], detail: { p } };
  }
  // choice (custom modes)
  return {
    label: msg.result.choice,
    tone: "meh",
    detail: {
      confidence: msg.result.confidence,
      probabilities: msg.result.probabilities,
    },
  };
}

function renderMessages() {
  const inner = $("#messages-inner");
  inner.innerHTML = "";
  const chat = currentChat();
  const empty = !chat || chat.messages.length === 0;
  $("#empty-state").classList.toggle("hidden", !empty);
  if (empty) return;

  for (const msg of chat.messages) {
    inner.appendChild(messageEl(msg));
  }
  scrollToBottom(false);
}

function messageEl(msg, animate = false) {
  const wrap = document.createElement("div");
  wrap.className = "flex " +
    (msg.role === "user" ? "justify-end" : "justify-start") +
    (animate ? " msg-enter" : "");
  if (msg.role === "user") {
    const bubble = document.createElement("div");
    bubble.className =
      "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap break-words";
    bubble.textContent = msg.text;
    wrap.appendChild(bubble);
    return wrap;
  }
  // Jev message
  const card = document.createElement("div");
  card.className = "card max-w-[85%] px-4 py-3 flex flex-col gap-2";
  const head = document.createElement("div");
  head.className = "flex items-center gap-2 text-xs text-muted-foreground";
  head.innerHTML = `<span>🔮</span><span class="font-medium">Jev</span>`;
  card.appendChild(head);

  const { label, tone, detail } = answerDisplay(msg);
  const answer = document.createElement("div");
  answer.className = "text-2xl font-bold " + (TONE_CLASSES[tone] || "");
  answer.textContent = label;
  card.appendChild(answer);

  if (detail && typeof detail.p === "number") {
    const pct = Math.round(detail.p * 100);
    const meter = document.createElement("div");
    meter.className = "flex items-center gap-2";
    meter.innerHTML =
      `<div class="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
         <div class="h-full rounded-full ${
        detail.p >= 0.5 ? "bg-green-500" : "bg-red-500"
      }" style="width:${pct}%"></div>
       </div>
       <span class="text-[11px] text-muted-foreground"></span>`;
    meter.querySelector("span").textContent = I18N[lang].yesProb(pct);
    card.appendChild(meter);
  } else if (detail && detail.probabilities) {
    const badges = document.createElement("div");
    badges.className = "flex flex-wrap gap-1";
    const entries = Object.entries(detail.probabilities).sort((a, b) =>
      b[1] - a[1]
    ).slice(0, 4);
    for (const [key, p] of entries) {
      const b = document.createElement("span");
      b.className = "badge";
      b.dataset.variant = key === msg.result.choice ? "default" : "outline";
      b.textContent = `${key} ${Math.round(p * 100)}%`;
      badges.appendChild(b);
    }
    card.appendChild(badges);
    if (typeof detail.confidence === "number") {
      const conf = document.createElement("span");
      conf.className = "text-[11px] text-muted-foreground";
      conf.textContent = I18N[lang].confidence(
        Math.round(detail.confidence * 100),
      );
      card.appendChild(conf);
    }
  }
  wrap.appendChild(card);
  return wrap;
}

function scrollToBottom(smooth = true) {
  const box = $("#messages");
  box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

/* ------------------------------- chat logic ------------------------------- */

function newChatObj() {
  return {
    id: crypto.randomUUID(),
    title: null,
    modeId: currentModeId,
    messages: [],
    createdAt: Date.now(),
  };
}

function buildState(chat, question) {
  const lines = [];
  const prior = chat.messages.slice(-MAX_CONTEXT_TURNS * 2);
  if (prior.length > 0) {
    lines.push("Conversation so far:");
    for (const m of prior) {
      if (m.role === "user") lines.push(`User: ${m.text}`);
      else if (!m.error) lines.push(`Jev: ${answerDisplay(m).label}`);
    }
    lines.push("");
  }
  lines.push(`The user's latest question: ${question}`);
  return lines.join("\n").slice(0, 5800);
}

function fallbackTitle() {
  const titles = I18N[lang].fallbackTitles;
  const base = titles[Math.floor(Math.random() * titles.length)];
  const n = chats.filter((c) => c.title && c.title.startsWith(base)).length;
  return n > 0 ? `${base} #${n + 1}` : base;
}

async function sendMessage(text) {
  if (pending) return;
  const question = text.trim();
  if (!question) return;

  let chat = currentChat();
  if (!chat) {
    chat = newChatObj();
    chats.unshift(chat);
    while (chats.length > MAX_CHATS) chats.pop();
    currentChatId = chat.id;
  }
  chat.modeId = currentModeId;
  const isFirst = chat.messages.length === 0;
  const mode = findMode(currentModeId);
  const state = buildState(chat, question);

  chat.messages.push({ role: "user", text: question });
  saveJSON(LS.chats, chats);
  $("#empty-state").classList.add("hidden");
  $("#messages-inner").appendChild(
    messageEl({ role: "user", text: question }, true),
  );
  scrollToBottom();

  // thinking indicator
  pending = true;
  $("#send-btn").disabled = true;
  const thinking = document.createElement("div");
  thinking.className = "flex justify-start msg-enter";
  thinking.innerHTML =
    `<div class="card px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
       <span>🔮</span><span></span>
       <span class="flex gap-0.5"><span class="thinking-dot">●</span><span class="thinking-dot">●</span><span class="thinking-dot">●</span></span>
     </div>`;
  thinking.querySelectorAll("span")[1].textContent = t("thinking");
  $("#messages-inner").appendChild(thinking);
  scrollToBottom();

  const body = {
    state,
    question,
    lang,
    wantTitle: isFirst,
    mode: mode.kind === "noul"
      ? { kind: "noul" }
      : { kind: "choice", options: mode.options },
  };

  let jevMsg;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    jevMsg = { role: "jev", modeId: mode.id, result: data.answer };
    if (isFirst) {
      chat.title = (data.title && data.title.confidence >= 0.25)
        ? data.title.text
        : fallbackTitle();
    }
  } catch (err) {
    console.error(err);
    jevMsg = { role: "jev", modeId: mode.id, error: true };
    if (isFirst) chat.title = fallbackTitle();
  }

  chat.messages.push(jevMsg);
  saveJSON(LS.chats, chats);
  pending = false;
  $("#send-btn").disabled = false;
  thinking.remove();
  $("#messages-inner").appendChild(messageEl(jevMsg, true));
  scrollToBottom();
  renderHistory();
  renderTitle();
}

/* ------------------------------ custom modes ------------------------------ */

function openCustomDialog() {
  $("#custom-error").classList.add("hidden");
  $("#custom-name").value = "";
  $("#custom-options").value = "";
  $("#custom-dialog").showModal();
}

function saveCustomMode() {
  const name = $("#custom-name").value.trim();
  const errEl = $("#custom-error");
  if (!name) {
    errEl.textContent = t("customNameError");
    errEl.classList.remove("hidden");
    return;
  }
  const options = [];
  const seen = new Set();
  for (const rawLine of $("#custom-options").value.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const [key, ...hintParts] = line.split("|");
    const k = key.trim().slice(0, 48);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const hint = hintParts.join("|").trim();
    options.push(hint ? { key: k, hint: hint.slice(0, 200) } : { key: k });
  }
  if (options.length < 2 || options.length > 8) {
    errEl.textContent = t("customOptionsError");
    errEl.classList.remove("hidden");
    return;
  }
  const mode = {
    id: "custom-" + crypto.randomUUID().slice(0, 8),
    name,
    kind: "choice",
    options,
  };
  customModes.push(mode);
  saveJSON(LS.customModes, customModes);
  currentModeId = mode.id;
  saveJSON(LS.mode, currentModeId);
  renderModeSelect();
  $("#custom-dialog").close();
}

/* --------------------------------- sidebar -------------------------------- */

function openSidebar() {
  $("#sidebar").classList.remove("-translate-x-full");
  $("#sidebar-backdrop").classList.remove("hidden");
}
function closeSidebar() {
  $("#sidebar").classList.add("-translate-x-full");
  $("#sidebar-backdrop").classList.add("hidden");
}

/* --------------------------------- wiring --------------------------------- */

$("#chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#chat-input");
  const text = input.value;
  input.value = "";
  input.style.height = "auto";
  sendMessage(text);
});

$("#chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $("#chat-form").requestSubmit();
  }
});
$("#chat-input").addEventListener("input", (e) => {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
});

$("#new-chat").addEventListener("click", () => {
  currentChatId = null;
  renderHistory();
  renderMessages();
  renderTitle();
  closeSidebar();
  $("#chat-input").focus();
});

$("#lang-select").addEventListener("change", (e) => {
  lang = e.target.value;
  saveJSON(LS.lang, lang);
  applyI18n();
  renderTitle();
});

$("#mode-select").addEventListener("change", (e) => {
  if (e.target.value === "__create__") {
    e.target.value = currentModeId;
    openCustomDialog();
    return;
  }
  currentModeId = e.target.value;
  saveJSON(LS.mode, currentModeId);
});

$("#sidebar-toggle").addEventListener("click", () => {
  if ($("#sidebar").classList.contains("-translate-x-full")) openSidebar();
  else closeSidebar();
});
$("#sidebar-backdrop").addEventListener("click", closeSidebar);

$("#custom-save").addEventListener("click", (e) => {
  e.preventDefault();
  saveCustomMode();
});
$("#custom-cancel").addEventListener("click", (e) => {
  e.preventDefault();
  $("#custom-dialog").close();
});

globalThis.matchMedia("(prefers-color-scheme: dark)").addEventListener(
  "change",
  (e) => {
    document.documentElement.classList.toggle("dark", e.matches);
  },
);

/* ---------------------------------- init ---------------------------------- */

if (!allModes().some((m) => m.id === currentModeId)) currentModeId = "classic";
applyI18n();
renderTitle();
