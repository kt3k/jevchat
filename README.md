# jevchat 🔮

A ChatGPT-style chat UI for
[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), TypeSafe
AI's System One model that never generates text — it only decides.

By default Jev answers **Yes** or **No**. You can switch to other answer styles
(Yes/No/Maybe, Magic 8-Ball, Cat, Samurai, Pirate, raw probabilities, …) or
create your own custom set of answers for Jev to choose from.

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

- Binary styles send a `noul` question ("is the answer to the user's latest
  question yes?") and map the returned yes-probability onto the style's labels.
- Custom styles send a `choice` question whose criteria are your answers.
- On the first message of a chat, a second `choice` question asks Jev to pick
  the question fragment that best captures the topic, which becomes the chat
  title.
