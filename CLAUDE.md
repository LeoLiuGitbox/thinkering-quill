@AGENTS.md

# Thinkering Quill Working Notes

## Product Direction

Thinkering Quill is currently defined as a focused **WA GATE / ASET prep app**.

- **Quantitative Reasoning**
- **Abstract Reasoning**
- **Reading Comprehension**

These three objective areas keep the existing practice / progression / upgrade loop.

## Writing Direction

Writing should no longer be treated as:

- image-first by default
- one-shot full composition submission
- AI-first scoring and judgement

Writing should now be treated as a **writing coaching system** with three modes:

- `micro_skill_drill`
- `guided_writing`
- `full_task`

The Writing module should prioritise:

- prompt interpretation
- idea selection
- structure
- detail and specificity
- `show, not tell`
- revision

## AI Role

AI should mainly be used for:

- scaffolding
- examples
- revision prompts
- feedback wording

AI should not be treated as the default authoritative writing scorer.

## Architecture Boundary

- K12 database work is being developed as a separate data-layer track
- Do not assume the current app has already been migrated to a K12-driven architecture
- Unless explicitly requested, preserve the existing objective-question flow and avoid broad rewrites

## Source of Truth

When product direction is unclear, align with:

1. `thinkering_quill_prd.md`
2. `DESIGN.md`
3. `README.md`
