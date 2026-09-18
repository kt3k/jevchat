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
      "Jev's answers are not always correct. Check important information.",
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
    details: "details",
    detailsChoiceIntro:
      "Jev picked the answer itself from these options (calibrated probabilities):",
    detailsNoulIntro: "Jev's raw yes-probability (noul), no mapping:",
    askAgain: "ask in another style",
    pickStyle: "Jev can answer in different styles — pick one:",
    shuffle: "Shuffle questions",
    suggestions: [
      "Is a hot dog a sandwich?",
      "Should I deploy on Friday?",
      "Do aliens exist?",
      "Is it okay to put pineapple on pizza?",
      "Is cereal a soup?",
      "Should I text my ex?",
      "Is water wet?",
      "Will AI take my job?",
      "Do I really need another mechanical keyboard?",
      "Is it too late to learn the piano?",
      "Do I need another coffee?",
      "Is my code ready for production?",
      "Should I get bangs?",
      "Can money buy happiness?",
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
      "Jev の回答は必ずしも正しいとは限りません。重要な情報は確認するようにしてください。",
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
    details: "詳細",
    detailsChoiceIntro: "Jev がこの選択肢の中から自分で選択 (較正済み確率):",
    detailsNoulIntro: "Jev が返した生のイエス確率 (noul)、マッピングなし:",
    askAgain: "別の回答スタイルで聞く",
    pickStyle: "Jev の答え方は変えられます — スタイルを選んでね:",
    shuffle: "他の質問を見る",
    suggestions: [
      "きのこの山はたけのこの里より美味しい?",
      "金曜日にデプロイしてもいい?",
      "宇宙人はいる?",
      "明日の会議、休んでもいい?",
      "カレーは飲み物?",
      "目玉焼きには醤油をかけるべき?",
      "元恋人に連絡してもいい?",
      "AIに仕事を奪われる?",
      "キーボード、もう1台買ってもいい?",
      "今からピアノを始めるのは遅い?",
      "コーヒーおかわりすべき?",
      "このコード、本番に出して大丈夫?",
      "前髪、切るべき?",
      "お金で幸せは買える?",
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
// Every mode is a Jev `choice` question: the options below become the choice
// criteria, so Jev itself picks which answer to give — no client-side
// probability mapping. Each option's hint tells Jev when that answer applies.
// Remix modes compose their options server-side from the question's fragments.

const BUILTIN_MODES = [
  {
    id: "classic",
    name: { en: "Yes / No (classic Jev)", ja: "Yes / No (Jev標準)" },
    kind: "choice",
    options: [
      {
        en: "Yes.",
        ja: "はい。",
        hint: "The answer to the user's question is yes",
      },
      {
        en: "No.",
        ja: "いいえ。",
        hint: "The answer to the user's question is no",
      },
    ],
  },
  {
    id: "maybe",
    name: { en: "Yes / No / Maybe", ja: "Yes / No / Maybe" },
    kind: "choice",
    options: [
      { en: "Yes.", ja: "はい。", hint: "The answer is clearly yes" },
      { en: "No.", ja: "いいえ。", hint: "The answer is clearly no" },
      {
        en: "Maybe.",
        ja: "たぶん。",
        hint: "Genuinely uncertain — it could go either way",
      },
    ],
  },
  {
    id: "honest",
    name: { en: "Yes / No / I don't know", ja: "Yes / No / わからない" },
    kind: "choice",
    options: [
      { en: "Yes.", ja: "はい。", hint: "The answer is clearly yes" },
      { en: "No.", ja: "いいえ。", hint: "The answer is clearly no" },
      {
        en: "I don't know.",
        ja: "わからない。",
        hint: "There is not enough information to decide",
      },
    ],
  },
  {
    id: "mom",
    name: { en: "Mom", ja: "おかん" },
    kind: "choice",
    options: [
      {
        en: "Fine, but wear a jacket.",
        ja: "ええよ。上着持っていきや。",
        hint: "The answer is yes",
      },
      {
        en: "Ask your father.",
        ja: "お父さんに聞いて。",
        hint: "Cannot or will not decide",
      },
      {
        en: "No. And clean your room.",
        ja: "あかん。部屋片付けなさい。",
        hint: "The answer is no",
      },
    ],
  },
  {
    id: "vibe",
    name: { en: "Vibe check", ja: "テンション高め" },
    kind: "choice",
    options: [
      {
        en: "ABSOLUTELY!!!",
        ja: "もちろん!!!",
        hint: "An emphatic, excited yes",
      },
      { en: "yeah, sure", ja: "うん、いいんじゃない", hint: "A casual yes" },
      {
        en: "meh.",
        ja: "びみょう。",
        hint: "Indifferent — neither yes nor no",
      },
      { en: "nah", ja: "ないね", hint: "A casual no" },
      {
        en: "ABSOLUTELY NOT.",
        ja: "絶対にない!!!",
        hint: "An emphatic, horrified no",
      },
    ],
  },
  {
    id: "pirate",
    name: { en: "Pirate", ja: "海賊" },
    kind: "choice",
    options: [
      {
        en: "Aye, cap'n!",
        ja: "アイアイサー！",
        hint: "The answer is yes",
      },
      {
        en: "Arr… the sea be foggy.",
        ja: "うーむ、海霧で見えぬ…",
        hint: "Too uncertain to decide",
      },
      { en: "Nay!", ja: "ノーじゃ！", hint: "The answer is no" },
    ],
  },
  // Remix styles: the server splits the question into fragments, crosses them
  // with these verdict templates ("{}" = fragment), and Jev picks one composed
  // answer — deciding the verdict and the topic fragment at the same time.
  {
    id: "unsei",
    name: { en: "Daily fortune", ja: "今日の運勢" },
    kind: "remix",
    templates: [
      {
        en: "{} outlook: excellent",
        ja: "{}運:大吉",
        hint: "The answer to the user's question is a strong yes",
      },
      {
        en: "{} outlook: good",
        ja: "{}運:吉",
        hint: "The answer is a mild yes",
      },
      {
        en: "{} outlook: poor",
        ja: "{}運:凶",
        hint: "The answer is a mild no",
      },
      {
        en: "{} outlook: doomed",
        ja: "{}運:大凶",
        hint: "The answer is a strong no",
      },
    ],
  },
  {
    id: "politician",
    name: { en: "Politician", ja: "政治家" },
    kind: "remix",
    templates: [
      {
        en: "Regarding {}, we will proceed positively.",
        ja: "{}については、前向きに検討いたします。",
        hint: "The answer leans yes",
      },
      {
        en: "On {}, I must refrain from answering.",
        ja: "{}につきましては、回答を差し控えます。",
        hint: "Too uncertain or sensitive to answer",
      },
      {
        en: "There are no plans whatsoever for {}.",
        ja: "{}は、断じてございません。",
        hint: "The answer leans no",
      },
    ],
  },
  {
    id: "headline",
    name: { en: "Tabloid", ja: "ネット見出し" },
    kind: "remix",
    templates: [
      {
        en: "BREAKING: {} — it's a go",
        ja: "【朗報】{}、アリ",
        hint: "The answer is yes",
      },
      {
        en: "BREAKING: {} — jury still out",
        ja: "【速報】{}、判断つかず",
        hint: "Too uncertain to decide",
      },
      {
        en: "BREAKING: {} — not happening",
        ja: "【悲報】{}、ナシ",
        hint: "The answer is no",
      },
    ],
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
  for (const el of document.querySelectorAll("[data-i18n-label]")) {
    el.setAttribute("aria-label", t(el.dataset.i18nLabel));
  }
  $("#lang-select").value = lang;
  renderModeSelect();
  renderSuggestions();
  renderStylePicker();
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

const SUGGESTION_COUNT = 6;

function renderSuggestions() {
  const box = $("#suggestions");
  box.innerHTML = "";
  const pool = [...I18N[lang].suggestions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const s of pool.slice(0, SUGGESTION_COUNT)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.dataset.variant = "outline";
    b.dataset.size = "sm";
    b.textContent = s;
    // Presets start the conversation immediately.
    b.addEventListener("click", () => sendMessage(s));
    box.appendChild(b);
  }
  const dice = document.createElement("button");
  dice.type = "button";
  dice.className = "btn";
  dice.dataset.variant = "ghost";
  dice.dataset.size = "sm";
  dice.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>';
  dice.title = t("shuffle");
  dice.setAttribute("aria-label", t("shuffle"));
  dice.addEventListener("click", renderSuggestions);
  box.appendChild(dice);
}

/** The display label of an option: built-in options are {en, ja, hint},
 * custom ones are {key, hint}. */
function optionLabel(opt) {
  return typeof opt.key === "string" ? opt.key : (opt[lang] || opt.en);
}

/** The options as sent to the API: Jev chooses among these labels. */
function sendOptions(mode) {
  return mode.options.map((o) => {
    const key = optionLabel(o);
    return o.hint ? { key, hint: o.hint } : { key };
  });
}

/** Short preview of how a mode answers, e.g. "Yes. / No." */
function modeExample(mode) {
  if (mode.kind === "noul") return I18N[lang].percentYes(87);
  if (mode.kind === "remix") {
    const blank = lang === "ja" ? "◯◯" : "...";
    const labels = mode.templates.map((t) =>
      (t[lang] || t.en).replace("{}", blank)
    );
    return `${labels[0]} / ${labels[labels.length - 1]}`;
  }
  const labels = mode.options.map(optionLabel);
  if (labels.length <= 4) return labels.join(" / ");
  // Long lists (e.g. 8-ball): show the two extremes.
  return `${labels[0]} … ${labels[labels.length - 1]}`;
}

function renderStylePicker() {
  const box = $("#style-picker");
  box.innerHTML = "";
  for (const m of allModes()) {
    const b = document.createElement("button");
    b.type = "button";
    const selected = m.id === currentModeId;
    b.className =
      "rounded-xl border p-3 text-left flex flex-col gap-1 transition-colors hover:bg-accent cursor-pointer " +
      (selected
        ? "border-primary ring-1 ring-primary bg-accent/60"
        : "border-border");
    b.setAttribute("aria-pressed", String(selected));
    const head = document.createElement("div");
    head.className = "text-sm font-medium truncate";
    head.textContent = modeName(m);
    const example = document.createElement("div");
    example.className = "text-xs text-muted-foreground truncate";
    example.textContent = modeExample(m);
    b.append(head, example);
    b.addEventListener("click", () => {
      currentModeId = m.id;
      saveJSON(LS.mode, currentModeId);
      $("#mode-select").value = m.id;
      renderStylePicker();
    });
    box.appendChild(b);
  }
  // "Create your own" tile
  const create = document.createElement("button");
  create.type = "button";
  create.className =
    "rounded-xl border border-dashed border-border p-3 text-left flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent cursor-pointer";
  create.textContent = t("createCustom");
  create.addEventListener("click", openCustomDialog);
  box.appendChild(create);
}

function renderHistory() {
  const nav = $("#history");
  nav.innerHTML = "";
  for (const chat of chats) {
    const row = document.createElement("div");
    row.className =
      "group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer text-sm hover:bg-accent " +
      (chat.id === currentChatId ? "bg-accent font-medium" : "");
    const text = document.createElement("div");
    text.className = "flex-1 min-w-0 flex flex-col";
    const title = document.createElement("span");
    title.className = "truncate";
    title.textContent = chat.title || t("untitled");
    const mode = findMode(chat.modeId);
    const style = document.createElement("span");
    style.className = "truncate text-[11px] text-muted-foreground font-normal";
    style.textContent = modeName(mode);
    text.append(title, style);
    row.appendChild(text);
    const del = document.createElement("button");
    del.className =
      "btn opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0";
    del.dataset.variant = "ghost";
    del.dataset.size = "icon-xs";
    del.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
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
      // Reopening a chat restores the style it was last asked in.
      if (chat.modeId && allModes().some((m) => m.id === chat.modeId)) {
        currentModeId = chat.modeId;
        saveJSON(LS.mode, currentModeId);
        $("#mode-select").value = currentModeId;
        renderStylePicker();
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

function answerDisplay(msg) {
  // Returns {label, detail} from the stored raw Jev result.
  if (msg.error) return { label: t("errorAnswer"), detail: null };
  if (msg.result.kind === "noul") {
    // "percent" mode (and history saved by older versions).
    return {
      label: I18N[lang].percentYes(Math.round(msg.result.p * 100)),
      detail: { p: msg.result.p },
    };
  }
  // choice: the label IS what Jev picked — no client-side mapping.
  return {
    label: msg.result.choice,
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
      "bg-muted rounded-3xl px-4 py-2 max-w-[80%] whitespace-pre-wrap break-words";
    bubble.textContent = msg.text;
    wrap.appendChild(bubble);
    return wrap;
  }
  // Jev message: plain text, ChatGPT-style (no card, no speaker line).
  const body = document.createElement("div");
  body.className = "max-w-[85%] flex flex-col gap-1";

  const { label, detail } = answerDisplay(msg);
  const answer = document.createElement("div");
  answer.className = "whitespace-pre-wrap break-words";
  answer.textContent = label;
  body.appendChild(answer);

  // The numbers are tucked away behind a collapsed "details" toggle so the
  // deadpan one-word answer stands alone.
  let detailsContent = null;
  if (detail && typeof detail.p === "number") {
    const pct = Math.round(detail.p * 100);
    const box = document.createElement("div");
    box.className = "pt-1 flex flex-col gap-1";
    const intro = document.createElement("div");
    intro.textContent = t("detailsNoulIntro");
    const meter = document.createElement("div");
    meter.className = "flex items-center gap-2";
    meter.innerHTML =
      `<div class="h-1 w-24 rounded-full bg-muted overflow-hidden">
         <div class="h-full rounded-full bg-muted-foreground" style="width:${pct}%"></div>
       </div>
       <span></span>`;
    meter.querySelector("span").textContent = I18N[lang].yesProb(pct);
    box.append(intro, meter);
    detailsContent = box;
  } else if (detail && detail.probabilities) {
    // Show Jev's full distribution over the options it chose from.
    const box = document.createElement("div");
    box.className = "pt-1 flex flex-col gap-1";
    const intro = document.createElement("div");
    intro.textContent = t("detailsChoiceIntro");
    box.appendChild(intro);
    const entries = Object.entries(detail.probabilities).sort((a, b) =>
      b[1] - a[1]
    );
    for (const [key, p] of entries) {
      const pct = Math.round(p * 100);
      const row = document.createElement("div");
      row.className = "flex items-center gap-2" +
        (key === msg.result.choice ? " font-medium" : "");
      row.innerHTML =
        `<div class="h-1 w-16 shrink-0 rounded-full bg-muted overflow-hidden">
           <div class="h-full rounded-full bg-muted-foreground" style="width:${pct}%"></div>
         </div>
         <span class="truncate"></span>
         <span class="shrink-0"></span>`;
      const [labelEl, pctEl] = row.querySelectorAll("span");
      labelEl.textContent = key;
      pctEl.textContent = `${pct}%`;
      box.appendChild(row);
    }
    if (typeof detail.confidence === "number") {
      const conf = document.createElement("div");
      conf.textContent = I18N[lang].confidence(
        Math.round(detail.confidence * 100),
      );
      box.appendChild(conf);
    }
    detailsContent = box;
  }

  const actions = document.createElement("div");
  actions.className = "flex items-start gap-3";
  if (detailsContent) actions.appendChild(detailsEl(detailsContent));
  const question = questionFor(msg);
  if (question) actions.appendChild(reAskDropdown(question));
  if (actions.childNodes.length > 0) body.appendChild(actions);

  wrap.appendChild(body);
  return wrap;
}

/** The question this Jev message answered (stored on new messages; derived
 * from the preceding user message for history saved by older versions). */
function questionFor(msg) {
  if (msg.question) return msg.question;
  const chat = currentChat();
  if (!chat) return null;
  const i = chat.messages.indexOf(msg);
  for (let j = (i < 0 ? chat.messages.length : i) - 1; j >= 0; j--) {
    if (chat.messages[j].role === "user") return chat.messages[j].text;
  }
  return null;
}

/** "Ask in another style" text button with a style dropdown. */
function reAskDropdown(question) {
  const dd = document.createElement("details");
  dd.className = "relative text-[11px] text-muted-foreground";
  dd.dataset.dropdown = "";
  const sum = document.createElement("summary");
  sum.className =
    "cursor-pointer select-none w-fit opacity-70 hover:opacity-100";
  sum.textContent = t("askAgain");
  const wrap = document.createElement("div");
  wrap.className =
    "absolute left-0 z-20 min-w-48 rounded-lg border border-border bg-background shadow-md overflow-hidden text-sm text-foreground";
  const menu = document.createElement("div");
  menu.className = "scrollbar-sm max-h-64 overflow-y-auto py-1";
  // Fade edges signal that the list scrolls; shown only while more content
  // is hidden in that direction.
  const fade = (side) => {
    const f = document.createElement("div");
    f.className =
      `pointer-events-none absolute inset-x-0 ${side}-0 h-8 opacity-0 transition-opacity duration-150`;
    f.style.background = `linear-gradient(to ${
      side === "top" ? "bottom" : "top"
    }, var(--color-background), transparent)`;
    return f;
  };
  const fadeTop = fade("top");
  const fadeBottom = fade("bottom");
  const updateFades = () => {
    fadeTop.classList.toggle("opacity-0", menu.scrollTop <= 4);
    fadeBottom.classList.toggle(
      "opacity-0",
      menu.scrollTop + menu.clientHeight >= menu.scrollHeight - 4,
    );
  };
  menu.addEventListener("scroll", updateFades);
  // Open upward when the trigger sits near the bottom of the scroll area, so
  // the menu isn't hidden behind the chat input.
  dd.addEventListener("toggle", () => {
    if (!dd.open) return;
    const viewport = $("#messages").getBoundingClientRect();
    const trigger = sum.getBoundingClientRect();
    const spaceBelow = viewport.bottom - trigger.bottom - 8;
    const spaceAbove = trigger.top - viewport.top - 8;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    menu.style.maxHeight =
      Math.min(256, Math.max(120, openUp ? spaceAbove : spaceBelow)) + "px";
    wrap.classList.toggle("bottom-full", openUp);
    wrap.classList.toggle("mb-1", openUp);
    wrap.classList.toggle("top-full", !openUp);
    wrap.classList.toggle("mt-1", !openUp);
    updateFades();
  });
  for (const m of allModes()) {
    const b = document.createElement("button");
    b.type = "button";
    b.className =
      "w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-1.5 cursor-pointer";
    const name = document.createElement("span");
    name.className = "truncate";
    name.textContent = modeName(m);
    b.append(name);
    b.addEventListener("click", () => {
      dd.open = false;
      reAsk(question, m);
    });
    menu.appendChild(b);
  }
  wrap.append(menu, fadeTop, fadeBottom);
  dd.append(sum, wrap);
  return dd;
}

function detailsEl(content) {
  const det = document.createElement("details");
  det.className = "text-[11px] text-muted-foreground";
  const sum = document.createElement("summary");
  sum.className =
    "cursor-pointer select-none w-fit opacity-70 hover:opacity-100";
  sum.textContent = t("details");
  det.append(sum, content);
  return det;
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
  // The question is passed separately below; don't repeat it as history when
  // it is the (already appended) latest user message.
  let history = chat.messages;
  const last = history[history.length - 1];
  if (last?.role === "user" && last.text === question) {
    history = history.slice(0, -1);
  }
  const prior = history.slice(-MAX_CONTEXT_TURNS * 2);
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
  const isFirst = chat.messages.length === 0;

  chat.messages.push({ role: "user", text: question });
  saveJSON(LS.chats, chats);
  $("#empty-state").classList.add("hidden");
  $("#messages-inner").appendChild(
    messageEl({ role: "user", text: question }, true),
  );
  scrollToBottom();

  await askJev(chat, question, findMode(currentModeId), isFirst);
}

/** Re-ask the same question in a different style: appends only Jev's new
 * answer, without repeating the question or changing the selected style. */
function reAsk(question, mode) {
  const chat = currentChat();
  if (!chat || pending) return;
  askJev(chat, question, mode, false);
}

async function askJev(chat, question, mode, isFirst) {
  // The asked style becomes the chat's (and the globally selected) style, so
  // picking one via "ask in another style" sticks.
  chat.modeId = mode.id;
  if (currentModeId !== mode.id) {
    currentModeId = mode.id;
    saveJSON(LS.mode, currentModeId);
    $("#mode-select").value = mode.id;
    renderStylePicker();
  }

  const state = buildState(chat, question);

  // thinking indicator
  pending = true;
  $("#send-btn").disabled = true;
  const thinking = document.createElement("div");
  thinking.className = "flex justify-start msg-enter";
  thinking.innerHTML =
    `<div class="flex items-center gap-2 text-sm text-muted-foreground">
       <span></span>
       <span class="flex gap-0.5"><span class="thinking-dot">●</span><span class="thinking-dot">●</span><span class="thinking-dot">●</span></span>
     </div>`;
  thinking.querySelector("span").textContent = t("thinking");
  $("#messages-inner").appendChild(thinking);
  scrollToBottom();

  const body = {
    state,
    question,
    lang,
    wantTitle: isFirst,
    mode: mode.kind === "noul" ? { kind: "noul" } : mode.kind === "remix"
      ? {
        kind: "remix",
        templates: mode.templates.map((t) => ({
          tpl: t[lang] || t.en,
          hint: t.hint,
        })),
      }
      : { kind: "choice", options: sendOptions(mode) },
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
    jevMsg = { role: "jev", modeId: mode.id, question, result: data.answer };
    if (isFirst) {
      chat.title = (data.title && data.title.confidence >= 0.25)
        ? data.title.text
        : fallbackTitle();
    }
  } catch (err) {
    console.error(err);
    jevMsg = { role: "jev", modeId: mode.id, question, error: true };
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
  renderStylePicker();
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

function startNewChat() {
  currentChatId = null;
  renderHistory();
  renderMessages();
  renderTitle();
  closeSidebar();
  $("#chat-input").focus();
}
$("#new-chat").addEventListener("click", startNewChat);
$("#new-chat-mobile").addEventListener("click", startNewChat);

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
  renderStylePicker();
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

// Close any open "ask in another style" dropdown when clicking elsewhere.
document.addEventListener("click", (e) => {
  for (const dd of document.querySelectorAll("details[data-dropdown][open]")) {
    if (!dd.contains(e.target)) dd.open = false;
  }
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
