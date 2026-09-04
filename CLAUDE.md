# CLAUDE.md

## Project

Sight-reading generator. React 18 + TypeScript + Vite 7, Tailwind (compiled via PostCSS), ABCJS for score rendering and audio playback. Exercises come from any OpenAI-compatible chat API (`services/musicService.ts`, plain `fetch`); output is validated with `abcjs.parseOnly` + a header check and one retry before falling back to the in-browser generator (`getDefaultAbc`), which also runs when no API key is set.

- Provider is config-driven via `vite.config.ts` `define`: `API_KEY` (or `LLM_API_KEY` / `GLM_API_KEY`), optional `LLM_BASE_URL` (default `https://openrouter.ai/api/v1`), optional `LLM_MODEL` (default `z-ai/glm-5.2:free`). See `.env.example`. The call is client-side, so the key ships in the bundle — use a free / low-limit key.
- z.ai's standalone free tier for the *international* platform (`api.z.ai`) was removed; the free GLM models are on OpenRouter or the China platform (`open.bigmodel.cn`). `extractAbc` strips a `<think>` preamble so reasoning models still work.
- `npm run build` runs `tsc --noEmit` then `vite build`. `tsconfig.json` has `strict` + `noUnusedLocals`/`noUnusedParameters`, so dead code and unused params fail the build.
- Build stack: `vite@^7.3.6` + `@vitejs/plugin-react@^5.2.0` — these move together, plugin-react 4 does not support Vite 7+. Staying on Vite 7 (not 8) to avoid the rolldown engine for now. Vite 5.x is not an option: it has unpatched dev-server advisories.

## Gotchas

### ABCJS synth `onEnded`

`abcjs.synth.CreateSynth().start()` resolves when playback *starts*, not when it finishes. To react to playback ending (e.g. reset a play/pause button), pass an `onEnded` callback.

It must go inside the **nested `options` object** passed to `init()`, not at the top level:

```js
await synth.init({
  visualObj,
  audioContext: ac,
  millisecondsPerMeasure: visualObj.millisecondsPerMeasure(),
  options: {
    onEnded: () => { /* ... */ },
  },
});
```

`create-synth.js` does `var params = options.options ? options.options : {}` then `self.onEnded = params.onEnded`. A top-level `onEnded` is silently ignored. Same applies to `soundFontUrl`, `soundFontVolumeMultiplier`, `sequenceCallback`, etc.

`onEnded` is wired to `directSource[0].onended`, so it also fires on an explicit `synth.stop()`, not only on natural completion.

See `App.tsx` `togglePlay`.
