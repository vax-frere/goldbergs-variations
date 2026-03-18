# dialed.gg - Technical Analysis Report

> **URL**: [https://dialed.gg](https://dialed.gg)
> **Product**: Color Memory Game by [Lightspark](https://lightspark.com) designers
> **Version**: v1.4 (published 2026-02-12)
> **Analysis date**: 2026-03-18

---

## Overview

Dialed is a color memory game where players are shown five colors and must recreate them from memory using HSB sliders. It supports solo, multiplayer, and daily modes. The site is a masterclass in minimalist web craft - zero dependencies, everything handmade.

---

## Tech Stack Summary

| Category | Technology |
|---|---|
| Framework | **None** - Pure vanilla HTML/CSS/JS |
| Sound | **Web Audio API** (procedural synthesis) + **SpeechSynthesis** |
| Animations | **CSS @keyframes** (25 animations) + transitions |
| Typography | **Suisse Intl S Alt** (custom) + **Inter** (Google Fonts) |
| Backend | **Supabase** (PostgreSQL) |
| Storage | **localStorage** |
| Build tool | **None** - no bundler, no minification |
| PWA | Basic **manifest.json** support |

---

## Architecture

### Single-file app

The entire application lives in one HTML file (~7,350 lines) with everything inlined:

- `<style>` block for all CSS
- `<script>` blocks for all JavaScript
- Static HTML with screen-based routing (`.screen.active` pattern)

### No framework, no build step

- No React, Vue, Svelte, Angular, or any UI library
- No Vite, Webpack, Rollup, or any bundler
- No TypeScript, no JSX
- DOM manipulation is done via `document.getElementById()`, `querySelector()`, and direct `.style` mutations

### External dependencies

The only external dependency is **Supabase JS v2** loaded via CDN:

```
https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
```

Everything else is written from scratch.

---

## Typography

| Font | Source | Usage |
|---|---|---|
| **Suisse Intl S Alt** (Medium) | Self-hosted `.woff2` | Primary display font (titles, UI) |
| **Inter** (400, 500) | Google Fonts | Fallback body font |

The font loading strategy uses `font-display: swap` and the body starts with `opacity: 0`, fading in when fonts are ready (`body.fonts-ready { opacity: 1 }`).

---

## Sound System - Web Audio API

This is perhaps the most impressive part. The entire sound engine (`SFX` module) is built from scratch using the **Web Audio API** with no audio files and no libraries. All sounds are **procedurally synthesized** in real-time.

### Architecture

```
const SFX = (function() {
  let ctx = new (window.AudioContext || window.webkitAudioContext)();
  // ... IIFE module pattern
})();
```

The sound system handles AudioContext unlocking across browsers (including Safari's silent buffer trick) and supports a mute toggle persisted in localStorage.

### Core synthesis function

A `tone(freq, dur, vol, type)` helper generates simple tones using oscillators (`sine`, `triangle`, `sawtooth`, `square`) with exponential gain ramps for natural decay.

### Sound catalog

#### UI Interactions

| Sound | Description | Implementation |
|---|---|---|
| `hover()` | Generic hover | 880Hz sine, 60ms |
| `click()` | Generic click | 640Hz triangle + 960Hz sine (30ms delay) |
| `tick()` | Dark mode toggle | 1200Hz square, 25ms |
| `keystroke()` | Text input | 2-layer: impulse through resonant bandpass + low-frequency "thump" oscillator (simulates mechanical keyboard) |

#### Game modes

| Sound | Description | Implementation |
|---|---|---|
| `soloHover/Click` | Solo button | Single clean tone (720Hz sine) |
| `multiHover/Click` | Multiplayer button | Layered multi-voice chord (520Hz + 660Hz + 830Hz) |
| `soloHumStart/Update/Stop` | Solo button hold | Continuous drone, speed-responsive |
| `multiHumStart/Update/Stop` | Multiplayer button hold | 7-voice detuned choir - voices spread wider as speed increases |

#### Game flow

| Sound | Description |
|---|---|
| `blipReady()` | "Ready, set" countdown blip |
| `blipGo()` | "Go" countdown blip |
| `flutterStart/Update/Stop` | Evolving sound during color memorization |
| `sliderTick(val)` | HSB slider feedback |
| `tileFlip(i)` | Result tile reveal |
| `dailyDroneStart/Stop` | Ambient drone for daily mode |

#### Hard mode

| Sound | Description | Implementation |
|---|---|---|
| `hardOn()` | Activate hard mode | Descending sawtooth sweep (1800Hz to 60Hz) through waveshaper distortion |
| `hardOff()` | Deactivate hard mode | Reverse zap effect |

#### Theme transitions

| Sound | Description |
|---|---|
| `toDark()` | Switch to dark mode |
| `toLight()` | Switch to light mode |

### Speech Synthesis

The game uses the browser's **SpeechSynthesis API** to make a robotic voice announce actions:

```
robotSay(text, { delay, pitch, rate, volume })
```

Voice priority: **Zarvox** (macOS) > Trinoids > Cellos > Whisper > Fred > any English voice

| Function | Says | Pitch | Rate |
|---|---|---|---|
| `robotCopied()` | "link copied" | default | default |
| `robotSolo()` | "single player" | 0.1 | 0.85 |
| `robotMulti()` | "multiplayer" | 0.1 | 0.8 |
| `robotHardcore()` | "hard" | 0.01 | 0.55 |
| `robotEasy()` | "easy" | 0.8 | 0.7 |
| `robotDaily()` | "daily mode" | 0.01 | 0.5 |
| `robotHighscores()` | "high scores" | default | default |

---

## Animations - CSS Only

No animation library (no GSAP, Framer Motion, anime.js, or Lottie). All 25 `@keyframes` animations are pure CSS.

### Keyframe animations

| Animation | Effect | Duration |
|---|---|---|
| `ripple20` | Tap ripple (scale 1 to 1.6, fade out) | - |
| `ringSpin` | Rainbow ring rotation (CSS `@property` for `--ring-angle`) | continuous |
| `rainbowShift` | Animated rainbow gradient | 0.625s |
| `placeholderShimmer` | Shimmering placeholder text (gradient clip) | 3.5s |
| `blink` | Cursor blink | - |
| `linkColorCycle` | Link color transition | 1.2s |
| `nameShimmer` | Name input shimmer | - |
| `numSlideOut` | Score number exit | - |
| `numSlideIn` | Score number enter | - |
| `descFadeIn` | Description fade in | - |
| `lbSlideLeft` | Leaderboard slide left | 0.28s |
| `lbSlideRight` | Leaderboard slide right | 0.28s |
| `lb-ring-spin` | Leaderboard loading spinner | continuous |
| `cellReveal` | Result tile reveal | - |
| `fadeInRing` | Ring fade in | - |
| `dailyRevealRing` | Daily score ring reveal (scale bounce) | - |
| `dailyRevealBtn` | Daily button transform (scale + color) | - |
| `dailyRevealGlow` | Purple/red glow drop shadow | - |
| `dailyRevealBurst` | Expanding box-shadow burst | - |
| `springRight` | Spring/bounce to the right | - |
| `earthquake` | Horizontal screen shake (bad score) | 0.55s |
| `elasticContent` | Elastic counter-motion (during shake) | - |
| `elasticContentLate` | Late elastic counter-motion | - |
| `rgbSplit` | RGB chromatic aberration on text | - |
| `dailyVibrate` | Vibration for daily mode | - |

### Transition patterns

Buttons use micro-interactions with `transform: scale()`:

- Hover: `scale(1.02)` to `scale(1.08)`
- Active: `scale(0.94)` to `scale(0.97)`
- Transitions: typically `0.15s ease` for snappy feedback

Screen transitions use `opacity` with `0.3s` to `0.4s` ease timing.

### SVG Filters

A `<feGaussianBlur>` SVG filter provides horizontal motion blur during the earthquake/shake animation.

---

## Color Scoring Algorithm

The scoring goes beyond simple HSB value comparison. Colors are converted from HSB to RGB, then a **perceptual distance** is calculated between the player's guess and the target:

```
function hsbToRgb(h, s, b) { ... }

function scoreHsb(h1, s1, b1, h2, s2, b2) {
  const [r1, g1, bl1] = hsbToRgb(h1, s1, b1);
  const [r2, g2, bl2] = hsbToRgb(h2, s2, b2);
  // perceptual distance calculation
}
```

This is more accurate because HSB distances don't reflect how humans actually perceive color differences (e.g., hue changes matter less at low saturation).

---

## Backend - Supabase

### Services

| Feature | Endpoint |
|---|---|
| Leaderboard | `supabase.co/rest/v1/leaderboard` |
| Challenge CRUD | Supabase client (multiplayer rooms) |
| Daily colors | `supabase.co/rest/v1/` (daily API) |
| Session logging | A/B test tracking |
| Health check | Connectivity probe on load |

### Local storage

| Key | Purpose |
|---|---|
| `dialed_muted` | Mute preference |
| `dialed_games_played` | Games played counter |
| `ab_session_id` | A/B test session ID |
| `ab_first_rounds` | A/B test variant |
| `ab_skip_name` | A/B test variant |

---

## SEO and Metadata

- Full **Open Graph** and **Twitter Card** meta tags
- Dynamic OG image endpoint (`/api/og-image`)
- **JSON-LD structured data** (VideoGame + WebSite schemas)
- `manifest.json` for PWA installability
- Semantic HTML with proper `aria-label` attributes

---

## Performance Considerations

- **No framework overhead** - zero JS bundle to parse
- **No build step** - the HTML file IS the production artifact
- **DNS prefetch + preconnect** for Supabase and Google Fonts
- **Font-display: swap** to prevent FOIT
- **Single HTTP request** for the entire app (+ font + Supabase CDN)
- Sounds are generated on-the-fly (no audio files to download)

---

## Key Takeaways

1. **Zero-dependency philosophy**: Proves that a polished, interactive web experience can be built without any framework or library
2. **Procedural audio**: The Web Audio API sound system is remarkably sophisticated - mechanical keyboard clicks, multi-voice choirs, distorted zaps, all synthesized in real-time
3. **CSS-only animations**: 25 keyframe animations handling everything from subtle shimmers to screen-shaking earthquakes with chromatic aberration
4. **Single-file architecture**: ~7,350 lines in one HTML file, no build tools, no bundling - the simplest possible deployment
5. **Thoughtful micro-interactions**: Every button has a unique hover/active state, every action has a distinct sound, the speech synthesis adds personality
6. **Perceptual accuracy**: Color scoring uses RGB-space perceptual distance rather than naive HSB comparison

---

*Made by the designers at [Lightspark](https://lightspark.com)*
