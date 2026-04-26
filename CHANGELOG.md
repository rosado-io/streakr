# Changelog

## 0.1.5 (2026-04-26)

## What's Changed
* ci: consolidate workflows and skip release-please PRs by @rosado-io in https://github.com/rosado-io/streakr/pull/62
* chore(deps): bump postcss from 8.5.9 to 8.5.10 in the npm_and_yarn group across 1 directory by @dependabot[bot] in https://github.com/rosado-io/streakr/pull/63


**Full Changelog**: https://github.com/rosado-io/streakr/compare/streakr-v0.1.4...streakr-v0.1.5

## 0.1.4 (2026-04-25)

## What's Changed
* fix(ci): fix auto-merge, upgrade actions, add npm environment by @rosado-io in https://github.com/rosado-io/streakr/pull/60


**Full Changelog**: https://github.com/rosado-io/streakr/compare/streakr-v0.1.3...streakr-v0.1.4

## [0.1.3](https://github.com/rosado-io/streakr/compare/streakr-v0.1.2...streakr-v0.1.3) (2026-04-25)


### 🐛 Bug Fixes

* scope package as @rosado-io/streakr, optimize CI, and auto-merge releases ([#58](https://github.com/rosado-io/streakr/issues/58)) ([b523ad3](https://github.com/rosado-io/streakr/commit/b523ad3d5e6766c9452874117bc71bd5c0641cdc))

## [0.1.2](https://github.com/rosado-io/streakr/compare/streakr-v0.1.1...streakr-v0.1.2) (2026-04-25)


### 🐛 Bug Fixes

* **demo:** polish copy and remove mock references ([#56](https://github.com/rosado-io/streakr/issues/56)) ([d673c3a](https://github.com/rosado-io/streakr/commit/d673c3a78d6521f0cd636610fa5e663e1494dcb0))


### 📖 Documentation

* add quickstart and provider docs ([#54](https://github.com/rosado-io/streakr/issues/54)) ([a682d4e](https://github.com/rosado-io/streakr/commit/a682d4ed9c3140568541b76c1202036e7f205b9a))

## [0.1.1](https://github.com/rosado-io/streakr/compare/streakr-v0.1.0...streakr-v0.1.1) (2026-04-20)


### ✨ Features

* add GitHub GraphQL provider (STR-14) ([38bb370](https://github.com/rosado-io/streakr/commit/38bb370d98442d8e3fbb653e26aa4b786f88bda6))
* add GitLab provider (STR-15) ([c7e4132](https://github.com/rosado-io/streakr/commit/c7e4132b545d5154763c04613e32fab07de804be))
* add GitLab REST provider (STR-15) ([96c14a3](https://github.com/rosado-io/streakr/commit/96c14a38331cf7edb589b217220d5faa30ab683f))
* **demo:** visual polish, scroll layout, and legend as widget component ([#46](https://github.com/rosado-io/streakr/issues/46)) ([b1ef31b](https://github.com/rosado-io/streakr/commit/b1ef31ba7f0d19680f5c1c175844eb12b8d428c0))
* implement aggregate with concurrent fetch and source tagging (STR-13) ([1c5e193](https://github.com/rosado-io/streakr/commit/1c5e193147fa995a4dc89f8f9ccf5a62dd7f7ad2))
* implement aggregate with concurrent fetch and source tagging (STR-13) ([6d379d5](https://github.com/rosado-io/streakr/commit/6d379d5d350b54c3cb1bae76077a95cada499c69))
* implement buildCalendarGrid with intensity levels and week config (STR-12) ([10e860c](https://github.com/rosado-io/streakr/commit/10e860c383f86708e85e071955d0060cba96cfeb))
* implement buildCalendarGrid with intensity levels and week config (STR-12) ([7c8e65e](https://github.com/rosado-io/streakr/commit/7c8e65e839bb49250ed27045812bfd4447ecd284))
* implement computeStreaks with total, best, and current streak (STR-11) ([d6b55fe](https://github.com/rosado-io/streakr/commit/d6b55fe784b4c7f2b90ba7ae5d6f66067ef608af))
* implement computeStreaks with total, best, and current streak (STR-11) ([e8dc52c](https://github.com/rosado-io/streakr/commit/e8dc52c1f605abac325d4c3e8a6b3d0d8d067e5d))
* implement GitHub GraphQL provider (STR-14) ([c255550](https://github.com/rosado-io/streakr/commit/c255550950ed25b5aed03e12cdc1098c87dada60))
* implement normalizeEventsToDaily with gap-fill, dedup, and sort (STR-10) ([e7caefb](https://github.com/rosado-io/streakr/commit/e7caefb26e26f347a6de7512941a0788c7b331b7))
* implement normalizeEventsToDaily with gap-fill, dedup, and sort (STR-10) ([a75ab74](https://github.com/rosado-io/streakr/commit/a75ab741bd99a030900b587d9fcceed3996b3eb3))
* implement STR-17 theme system ([177e73b](https://github.com/rosado-io/streakr/commit/177e73b108f80aac43e408c2f1004a2ed53a164b))
* implement STR-18 demo playground ([a2c9722](https://github.com/rosado-io/streakr/commit/a2c9722c47c8cf65b7796b00ce70ab5532185714))
* implement vanilla SVG heatmap renderer (STR-16) ([2907565](https://github.com/rosado-io/streakr/commit/29075658b8eedf79795158c50c680bcf0ca5f24c))
* render heatmap as vanilla SVG (STR-16) ([dbd62b7](https://github.com/rosado-io/streakr/commit/dbd62b71592d0a22a6d2e78fce35d3ed99a3ed4c))
* scaffold project with Vite library mode + TypeScript strict (STR-8) ([c1c19ed](https://github.com/rosado-io/streakr/commit/c1c19ed2ef5d0deddb7ee03addc4f9d86cd28676))
* scaffold project with Vite library mode + TypeScript strict (STR-8) ([4cd3eb0](https://github.com/rosado-io/streakr/commit/4cd3eb07525e3993a96f90c5a28a9761a17cddef))


### 🐛 Bug Fixes

* add packages field to pnpm-workspace to fix Github Actions install ([964270c](https://github.com/rosado-io/streakr/commit/964270cea0143019c8de007939885b4eaed18184))
* **ci:** use RELEASE_PLEASE_TOKEN to allow release-please PR creation ([#47](https://github.com/rosado-io/streakr/issues/47)) ([fff51a7](https://github.com/rosado-io/streakr/commit/fff51a719b46de75a7e3ed29743d1569aa1e4354))
* remove redundant non-null assertions in demo/main.ts ([84b049a](https://github.com/rosado-io/streakr/commit/84b049a8621f6746321cf04c62a7d3356c60f78a))
* resolve lint errors in GitLab provider ([8faff38](https://github.com/rosado-io/streakr/commit/8faff38ea6e92d7247459e9cfc115fd452258afc))
* resolve TS type errors in GitLab provider tests ([59a06a3](https://github.com/rosado-io/streakr/commit/59a06a3cc9a769fc66c9aa1196040fbc615ddc8f))
* scope intensity thresholds to visible range and guard inverted dates ([a85c29e](https://github.com/rosado-io/streakr/commit/a85c29e0431657b991bccbe00304eb89f95eb951))
* use UTC-safe date iteration to prevent timezone shifts ([3c7dbdc](https://github.com/rosado-io/streakr/commit/3c7dbdc991a0443a59ee6dbd55dd5cdb8a5b624a))


### ♻️ Refactoring

* comprehensive codebase cleanup, utility consolidation, and test expansion ([2da17f5](https://github.com/rosado-io/streakr/commit/2da17f593926ad9e3c231bc212f0d08c3b87e2db))
* extract css variables, modularize demo, and add sonarcloud integration ([dd15f3c](https://github.com/rosado-io/streakr/commit/dd15f3c2c24c97d84d22ab497fc044ca707ae16b))
