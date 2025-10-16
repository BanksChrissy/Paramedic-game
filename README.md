# Paramedic Rhythm Trainer

This project provides the foundation for a real‑time paramedic rhythm training application.

The repository is organised as a monorepo using [npm workspaces](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#workspaces).  All of the major components live under the `apps` and `packages` directories.

* `apps/ems-site` – A simple desktop‑first web application that hosts the training experience.
* `packages/shared` – Shared types, validation schemas and event bus definitions.
* `packages/engine-ecg` – A pure TypeScript module that synthesises 12‑lead ECG samples from parametric or timeline rhythm specifications.
* `packages/renderer-uplot` – An adapter around the uPlot charting library for rendering ECG waveforms.
* `packages/interventions` – Models for pacing, cardioversion, defibrillation and medication administration.
* `packages/game-logic` – The state machine that manages the question flow, scoring and timers.
* `packages/casepacks` – JSON files describing rhythm cases, their generators and intervention responses.
* `packages/ui-kit` – Shared user interface primitives.
* `packages/mascot` – Placeholder for optional mascot character assets.

At this stage the project contains only the scaffold; implementation of the detailed functionality is deferred to later phases of development.  Feel free to explore each package and fill in the TODOs.