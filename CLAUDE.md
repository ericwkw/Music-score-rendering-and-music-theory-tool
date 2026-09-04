# CLAUDE.md

## Project

Sight-reading generator. React 18 + TypeScript + Vite, Tailwind (compiled via PostCSS), ABCJS for score rendering and audio playback, `@google/genai` for exercise generation. Runs in an offline fallback mode (`getDefaultAbc`) when no API key is set.

- API key: `API_KEY` or `VITE_API_KEY` in `.env` (see `.env.example`); injected by `vite.config.ts` via `loadEnv` as `process.env.API_KEY`.
- `npm run build` runs `tsc --noEmit` then `vite build`. `tsconfig.json` has `strict` + `noUnusedLocals`/`noUnusedParameters`, so dead code and unused params fail the build.

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
