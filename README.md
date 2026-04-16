# Thinkering Quill

Thinkering Quill is a focused **WA GATE / ASET prep app** for primary-aged learners.

The current product direction is intentionally split in two:

- **Objective sections** stay exam-focused and keep the existing drill / upgrade / feedback loop
- **Writing** is being repositioned as a **writing coaching system**, not a one-shot "write a full piece and let AI score it" tool

## Product Shape

The app currently targets four WA GATE / ASET-aligned areas:

- **Quantitative Reasoning**
- **Abstract Reasoning**
- **Reading Comprehension**
- **Writing**

The first three remain strongly targeted practice modes.

Writing now follows a different training model:

- `micro_skill_drill`
- `guided_writing`
- `full_task`

That means the writing module is intended to help learners improve:

- prompt interpretation
- idea selection
- structure
- detail and specificity
- `show, not tell`
- revision

Image prompts may still exist, but only as support for staged `full_task` sessions rather than as the default writing entry point.

## Current Direction

This repository is evolving away from a broad "magical learning world" pitch and toward a more honest definition:

- a **highly targeted prep app** for the three objective sections
- a **coaching-oriented writing system** for Writing

AI is expected to help with:

- scaffolding
- examples
- revision prompts
- feedback wording

AI is **not** treated as the default authoritative writing scorer.

## Docs

Core product and system documents:

- [PRD](./docs/product/thinkering_quill_prd.md)
- [System Design](./docs/product/DESIGN.md)

K12 database work is currently kept as a separate data-layer track:

- [K12 schema init SQL](./db/k12_learning_engine_init.sql)
- [K12 API examples](./docs/k12_learning_engine_api_examples.md)

## Development

Start the local development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Notes

- The current codebase still contains older assumptions in places; PRD and DESIGN now reflect the updated Writing direction.
- K12 knowledge-structure integration is being treated as a separate architecture/data track and is not yet the default application backbone.
