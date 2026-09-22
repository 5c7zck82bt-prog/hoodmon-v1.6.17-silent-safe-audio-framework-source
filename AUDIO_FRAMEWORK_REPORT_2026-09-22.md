# HOODMON v1.6.17 — Silent-Safe Audio Framework Report

Date: 2026-09-22

## Goal

Prepare the HOODMON app for music, battle sound effects, UI/card sounds, and future audio polish **without shipping or enabling any unapproved audio asset yet**.

## What was added

### Persistent player audio settings

The app now has a global audio settings layer with:

- Master mute and master volume
- Music on/off and music volume
- Battle SFX on/off and SFX volume
- UI/card audio on/off and UI/card volume
- Pause music when the app/tab is hidden
- Browser user-gesture audio unlock handling for future autoplay-safe playback
- Persistent settings under `hoodmon.audio.settings.v1`

The header has a fast master mute control plus an Audio settings button. Mobile keeps access through the compact gear version of the same control.

### Prepared audio cue registry

Twenty-one named cue slots are ready:

**Music**
- menu
- battle
- victory
- defeat

**UI / cards**
- UI click
- panel open
- panel close
- card pickup
- card drop
- phase change

**Battle SFX**
- Bond gain
- Hoodmon deploy
- evolution
- attack
- Hoodmon damage
- LP damage
- KO
- reaction
- Task complete
- victory sting
- defeat sting

Battle hooks are connected to the real existing event flow, so later approved assets can be inserted without changing match rules.

## Commercial-use safety lock

This release intentionally contains **zero playable audio files**.

Every audio registry entry currently has:

- `src: null`
- `licenseId: null`
- `approvedForCommercialUse: false`

The runtime requires **all three** before playback is possible:

1. a source file path,
2. a license-manifest ID,
3. `approvedForCommercialUse: true`.

Therefore simply dropping an MP3/WAV into the source tree or setting a file path is not enough to make an unapproved sound play.

`public/audio/LICENSE_MANIFEST.json` starts empty and defines the provenance fields that must be recorded for each future asset. `AUDIO_ASSET_CHECKLIST.md` documents the approval process.

This is a project safeguard, not a substitute for legal advice or for actually reviewing the license of a future asset.

## Audio policy carried forward

Do not register:

- free-plan MusicGPT generations without a commercial license for that exact asset,
- ripped game/movie/anime/social-media sounds,
- copyrighted commercial songs,
- third-party samples or voice clones without permission,
- audio packs with unclear commercial rights.

Prefer original/self-generated HOODMON audio with documented rights, or clearly documented CC0/public-domain material where appropriate.

## Validation

- Audio framework contract matrix: **32/32 PASS**
- TS/TSX syntax/transpile parsing: **40/40 PASS**
- Prepared audio slots: **21/21 present**
- Registry audio sources enabled: **0/21**
- Commercial approval flags enabled: **0/21**
- Playable audio binaries bundled: **0**
- License manifest assets registered: **0**
- Existing `src/game/engine/*.ts`: **unchanged from v1.6.16**
- Card display assets: **110/110 present**
- Card aspect ratios: **110/110 correct**
- CSS brace validation: **PASS**
- `node_modules`, `dist`, `.tsbuildinfo`: **not bundled**

A full Vite build was not performed because this source-only package intentionally does not include installed npm dependencies in the working environment. Syntax/source-contract validation was completed instead.

## Adding real audio later

When an approved sound is ready:

1. Put the file under `public/audio/`.
2. Add its provenance/license record to `public/audio/LICENSE_MANIFEST.json`.
3. Save the supporting license/receipt/project evidence outside the distributable app as part of the HOODMON rights archive.
4. Enter the matching file path and `licenseId` in `src/audio/audioRegistry.ts`.
5. Set `approvedForCommercialUse: true` only after the evidence is verified.
6. Run the audio matrix and a live browser listening pass.

No battle-engine rewrite should be required.
