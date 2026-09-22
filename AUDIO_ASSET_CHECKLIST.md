# HOODMON Audio Asset Checklist

Use this checklist before enabling any audio slot.

- [ ] Audio was created specifically for HOODMON or has a clearly documented commercial-use license.
- [ ] No unlicensed samples, reference songs, movie/game/anime clips, or third-party voice clones were used.
- [ ] AI generator plan/license at the time of generation permits commercial game/app use.
- [ ] Source project/export record has been saved.
- [ ] Receipt/subscription proof has been saved when relevant.
- [ ] A copy or screenshot/PDF of the applicable license/terms has been saved.
- [ ] Attribution requirements (if any) are documented.
- [ ] `public/audio/LICENSE_MANIFEST.json` contains an entry for the asset.
- [ ] Only then is the file path and matching license ID entered into `src/audio/audioRegistry.ts`.
- [ ] `approvedForCommercialUse` is changed to `true` only after all evidence above is complete.

## Prepared cue slots

Music: menu, battle, victory, defeat.

UI/cards: click, panel open/close, card pickup/drop, phase change.

Battle SFX: Bond gain, Hoodmon deploy, evolution, attack, Hoodmon damage, LP damage, KO, reaction, Task complete, victory, defeat.
