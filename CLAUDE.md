# CLAUDE.md

## Project

Sight-reading generator. React 18 + TypeScript + Vite 7, Tailwind (compiled via PostCSS), ABCJS for score rendering and audio playback. Exercises come from GLM-4.5-Flash (z.ai OpenAI-compatible endpoint, called with plain `fetch` in `services/musicService.ts`); output is validated with `abcjs.parseOnly` + a header check and one retry before falling back to the in-browser generator (`getDefaultAbc`), which also runs when no API key is set.

- API key: `API_KEY` or `GLM_API_KEY` or `VITE_API_KEY` in `.env` (see `.env.example`); injected by `vite.config.ts` via `loadEnv` as `process.env.API_KEY`. The API call is client-side, so the key ships in the bundle — same tradeoff as the previous Gemini setup.
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
