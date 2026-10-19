# Lido Pool Onboarding (prototype)

A small pixel-art onboarding demo for Lido Finance: walk around a campus by the pool, plant knowledge cards in the garden and
water them by playing three mini-games (Pool Rules, Who's Who, Staking 101). Phaser 4 + Vite + TypeScript, static PWA on GitHub Pages
(`/lido-onboarding/`). **Not an official Lido product.** Policies are fictional; structure facts come from public sources.
Concept and decisions: `ONBOARDING.md`. Notes for agents: `AGENTS.md` (Russian).

```bash
nvm use           # Node 24 (.nvmrc)
npm ci
npm run dev       # http://localhost:5173/lido-onboarding/?mute=1&dev=1&mem=1  (add &splash=0 to skip the splash)
npm run check     # typecheck + layers + banned APIs + tests + sprites + build
npm run art       # tools/art_*.py -> art/sprites/*.sprite.json
npm run sprites   # art/ -> public/atlas (Python 3 + Pillow 12.2.0)
```

Content lives in `content/lido/cards.json`. Deploy: push to `main` -> GitHub Actions (`.github/workflows/deploy.yml`) -> Pages.
