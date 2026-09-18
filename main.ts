// jevchat server — serves the static UI and proxies chat requests to the
// TypeSafe AI System One API (Jev), keeping JEV_KEY on the server.
import { serveDir } from "@std/http/file-server";

const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-latest";

const MAX_STATE_CHARS = 6000;
const MAX_OPTIONS = 8;
const MAX_OPTION_CHARS = 48;
const MAX_TITLE_CANDIDATES = 8;

interface ChoiceOption {
  key: string;
  hint?: string;
}

interface ChatRequest {
  state: string;
  question: string;
  mode: { kind: "noul" } | { kind: "choice"; options: ChoiceOption[] };
  wantTitle?: boolean;
  lang?: string;
}

type JevQuestion =
  | {
    type: "noul";
    instructions: string;
    criteria?: { true: string; false: string };
  }
  | { type: "choice"; instructions: string; criteria: Record<string, string> };

interface JevResponse {
  model: string;
  answers: Record<string, {
    type: string;
    noul?: number;
    choice?: string;
    probabilities?: Record<string, number>;
    confidence?: number;
  }>;
  usage?: { input_tokens: number; output_tokens: number };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Builds short fragments of the question for Jev to pick a chat title from.
 * Uses Intl.Segmenter so it works for Japanese (no spaces) as well as English.
 */
function titleCandidates(question: string, lang: string): string[] {
  let words: string[];
  try {
    const seg = new Intl.Segmenter(lang, { granularity: "word" });
    words = [...seg.segment(question)]
      .filter((s) => s.isWordLike)
      .map((s) => s.segment.trim())
      .filter((w) => w.length > 0);
  } catch {
    words = question.split(/\s+/).filter((w) => w.length > 0);
  }
  if (words.length === 0) return [];

  const joiner = lang.startsWith("ja") ? "" : " ";
  const candidates = new Set<string>();

  // The whole question works as a title when it is already short.
  const whole = question.trim();
  if (whole.length >= 2 && whole.length <= 24) candidates.add(whole);

  for (const n of [2, 3, 4]) {
    for (let i = 0; i + n <= words.length; i++) {
      const frag = words.slice(i, i + n).join(joiner);
      if (frag.length >= 2 && frag.length <= 24) candidates.add(frag);
    }
  }

  const all = [...candidates];
  if (all.length <= MAX_TITLE_CANDIDATES) return all;
  // Sample evenly across the question instead of only taking the head.
  const sampled: string[] = [];
  for (let i = 0; i < MAX_TITLE_CANDIDATES; i++) {
    sampled.push(all[Math.floor((i * all.length) / MAX_TITLE_CANDIDATES)]);
  }
  return [...new Set(sampled)];
}

function validate(body: unknown): ChatRequest | string {
  if (typeof body !== "object" || body === null) {
    return "body must be an object";
  }
  const b = body as Record<string, unknown>;
  if (typeof b.state !== "string" || b.state.trim().length === 0) {
    return "state is required";
  }
  if (b.state.length > MAX_STATE_CHARS) return "state is too long";
  if (typeof b.question !== "string" || b.question.trim().length === 0) {
    return "question is required";
  }
  const mode = b.mode as ChatRequest["mode"] | undefined;
  if (!mode || (mode.kind !== "noul" && mode.kind !== "choice")) {
    return "mode.kind must be 'noul' or 'choice'";
  }
  if (mode.kind === "choice") {
    const opts = mode.options;
    if (!Array.isArray(opts) || opts.length < 2 || opts.length > MAX_OPTIONS) {
      return `mode.options must have 2-${MAX_OPTIONS} entries`;
    }
    for (const o of opts) {
      if (
        typeof o?.key !== "string" || o.key.trim().length === 0 ||
        o.key.length > MAX_OPTION_CHARS
      ) {
        return "each option needs a short key";
      }
      if (
        o.hint !== undefined &&
        (typeof o.hint !== "string" || o.hint.length > 200)
      ) {
        return "option hint is too long";
      }
    }
    const keys = new Set(opts.map((o) => o.key.trim()));
    if (keys.size !== opts.length) return "option keys must be unique";
  }
  return {
    state: b.state,
    question: b.question,
    mode,
    wantTitle: b.wantTitle === true,
    lang: typeof b.lang === "string" ? b.lang : "en",
  };
}

async function handleChat(req: Request): Promise<Response> {
  const key = Deno.env.get("JEV_KEY");
  if (!key) return json({ error: "server is missing JEV_KEY" }, 500);

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const chat = validate(parsed);
  if (typeof chat === "string") return json({ error: chat }, 400);

  const questions: Record<string, JevQuestion> = {};
  if (chat.mode.kind === "noul") {
    questions.answer = {
      type: "noul",
      instructions:
        "You are answering the user's latest question directly. Is the answer to that question 'yes'?",
      criteria: {
        true:
          "The most reasonable direct answer to the user's latest question is yes",
        false:
          "The most reasonable direct answer to the user's latest question is no",
      },
    };
  } else {
    const criteria: Record<string, string> = {};
    for (const o of chat.mode.options) {
      criteria[o.key.trim()] = o.hint?.trim() ||
        `The best direct answer to the user's latest question is "${o.key.trim()}"`;
    }
    questions.answer = {
      type: "choice",
      instructions:
        "Pick the option that best answers the user's latest question.",
      criteria,
    };
  }

  let candidates: string[] = [];
  if (chat.wantTitle) {
    candidates = titleCandidates(chat.question, chat.lang ?? "en");
    if (candidates.length >= 2) {
      const criteria: Record<string, string> = {};
      for (const c of candidates) {
        criteria[c] = "A fragment extracted from the user's question";
      }
      questions.title = {
        type: "choice",
        instructions:
          "Pick the fragment that best captures the main topic of the user's question, to be used as a short chat title.",
        criteria,
      };
    }
  }

  let jev: JevResponse;
  try {
    const res = await fetch(JEV_ENDPOINT, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ state: chat.state, model: JEV_MODEL, questions }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Jev API error ${res.status}: ${detail.slice(0, 500)}`);
      return json({ error: "jev_api_error", status: res.status }, 502);
    }
    jev = await res.json();
  } catch (err) {
    console.error("Jev API request failed:", err);
    return json({ error: "jev_unreachable" }, 502);
  }

  const answer = jev.answers?.answer;
  if (!answer) return json({ error: "jev_bad_response" }, 502);

  const result: Record<string, unknown> = {
    model: jev.model,
    usage: jev.usage,
  };
  if (answer.type === "noul" && typeof answer.noul === "number") {
    result.answer = { kind: "noul", p: answer.noul };
  } else if (answer.type === "choice" && typeof answer.choice === "string") {
    result.answer = {
      kind: "choice",
      choice: answer.choice,
      probabilities: answer.probabilities ?? {},
      confidence: answer.confidence ?? null,
    };
  } else {
    return json({ error: "jev_bad_response" }, 502);
  }

  const title = jev.answers?.title;
  if (title?.type === "choice" && typeof title.choice === "string") {
    result.title = { text: title.choice, confidence: title.confidence ?? 0 };
  } else {
    result.title = null;
  }

  return json(result);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/api/chat") {
    if (req.method !== "POST") {
      return json({ error: "method not allowed" }, 405);
    }
    return await handleChat(req);
  }
  return serveDir(req, { fsRoot: "static", quiet: true });
});
