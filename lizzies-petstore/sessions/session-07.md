# Session 7 — Animation Engine
**Model:** Opus | **Focus:** Pivot-based animation for all creature states

## Deliverables

- `animation.js` — Pivot animation system:
  - **AnimationState object:** Per-part transform deltas computed per frame from animation curves
  - **Idle cycle:** Breathing (torso scaleY +/-3%, 2s sine), Blink (eyes close 3-6s random), Ear twitch (+/-5 deg, 4-8s random), Tail sway (+/-15 deg, 1.5s sine), Wing fold (scale -10%, 3s cycle)
  - **Walk cycle:** Legs alternate +/-20 deg, body bobs +/-3px, head follows with delay, tail follows direction
  - **Fly cycle:** Wings flap +/-45 deg at 0.5s, body lifts +/-8px, legs tuck, tail streams
  - **Happy reaction:** 3 hops, sparkle particles, heart particles, 360 spin on last hop
  - **Eating:** Head dips 20px, 3 quick bobs, return, satisfied blink
  - **Sleeping:** Eyes closed, breathing amplitude doubles, zzz particles from head
  - **Bathing:** Shake/wiggle, sparkle particles replacing dirt
  - **"A little bored"** (low happiness): Slower idle, head tilts, looks toward player — NOT sad
- Morphology-adaptive: no wings → no fly, no legs → float/slither, tentacles → undulate
- Delta-time based, RAF delta capped at 50ms
- Integration with creature-cache.js (drawImage with transforms on cached canvases)

## Session end
- Run `/petstore-checklist`, run validation, run petstore-web-review agent, commit + push
