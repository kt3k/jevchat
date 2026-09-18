# jevchat 🔮

A ChatGPT-style chat UI for
[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), TypeSafe
AI's System One model that never generates text — it only decides.

By default Jev answers **Yes** or **No**. You can switch to other answer styles
(Yes/No/Maybe, Mom, Pirate, Fortune teller, raw probabilities, …) or create your
own custom set of answers for Jev to choose from.

## Features

- ChatGPT-like UI: sidebar with chat history, main chat area
- Answer styles built on Jev's calibrated probabilities (`noul`) and `choice`
  questions
- Custom answer styles (stored locally)
- Chat titles extracted from your question by Jev itself (`choice` over question
  fragments, segmented with `Intl.Segmenter` so Japanese works too), with
  playful fallbacks when Jev isn't confident
- English / Japanese UI, defaulting to the browser's language preference
- History kept in `localStorage` (max 10 chats — it's a demo)
- Styling: Tailwind CSS + [Basecoat UI](https://basecoatui.com), dark mode
  included

## Running locally

Requires [Deno](https://deno.com) 2.x and a TypeSafe AI API key.

```sh
JEV_KEY=your-api-key deno task start
# → http://localhost:8000
```

## Deploying to Deno Deploy

The entrypoint is `main.ts`. Set the `JEV_KEY` environment variable in your Deno
Deploy project settings.

```sh
deno deploy
```

## How it talks to Jev

The server proxies `POST /api/chat` to
`POST https://api.typesafe.ai/v1/systemone` (the API key never reaches the
browser):

- Every answer style (built-in and custom) sends a `choice` question whose
  criteria are the style's answers, so Jev itself picks which answer to give —
  there is no client-side probability mapping. The collapsed "details" toggle
  under each reply shows Jev's calibrated probability for every option.
- The one exception is the "Just the numbers" style, which sends a `noul`
  question and shows the raw yes-probability.
- Remix styles (Daily fortune, Politician, Tabloid) go one step further: the
  server splits the question into fragments (the same `Intl.Segmenter` machinery
  as chat titles), crosses them with verdict templates like
  `"【悲報】{}、ナシ"`, and Jev picks one fully composed answer — deciding the
  verdict and which fragment is the topic in a single `choice` question.
- On the first message of a chat, a second `choice` question asks Jev to pick
  the question fragment that best captures the topic, which becomes the chat
  title.
