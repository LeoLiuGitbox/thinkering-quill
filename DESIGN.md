# GATE Prep Web App — Implementation Plan

## Context
Build a local web app for Year 5 kids preparing for the **Western Australia GATE** (Gifted and Talented Education) exam — a selective school entry test taken at age 10–11 for Year 7 entry. The app runs fully on the user's 2017 iMac (Python 3.9, no Node.js). It uses the Claude API for adaptive content generation. The visual theme is **fantasy/wizard** — kids cast spells and brew potions by completing questions. The app supports **multiple child profiles** (each with their own progress/badges) with login on startup.

---

## WA GATE Exam Structure (Content Scope)

The WA GATE test has 4 components — the app covers all of them:

| Component | Question Format | Notes |
|---|---|---|
| **Abstract Reasoning** | MCQ — pattern sequences, matrices, spatial reasoning described in text + Unicode symbols | Claude generates text-based pattern problems (e.g. shape series, odd-one-out) |
| **Quantitative Reasoning** | MCQ — word problems, number patterns, logical maths, no calculator | Core maths reasoning, not rote arithmetic |
| **Reading Comprehension** | MCQ — short passage (150–250 words) + 4–5 questions | Inference, vocabulary, main idea |
| **Creative Writing** | Coached writing practice — skill drills, guided writing, and staged full tasks | Writing focuses on prompt interpretation, idea development, structure, expression, revision, and `show, not tell`; image prompts are reserved for full tasks only |

---

## User Profiles

- **Login screen** shown on app start: displays all existing profiles as wizard character cards
- Each profile has: name, avatar colour (wizard robe colour), creation date, cumulative XP
- "Add new wizard" button creates a profile (asks for name)
- All DB tables include a `profile_id` foreign key — progress, badges, streaks are per-profile
- **Parent dashboard** accessible from the nav bar (no PIN) — shows all profiles side-by-side, can delete a profile

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend | Flask 2.x | Lightweight, no config, Python-native |
| Frontend | Jinja2 + vanilla JS | No build step, no Node.js needed |
| Storage | SQLite (stdlib `sqlite3`) | Zero-install, single `.db` file |
| AI | `anthropic` SDK + claude-sonnet-4-6 | Smart content generation |
| Dependencies | `flask`, `anthropic`, `python-dotenv` | Only 3 pip packages |

---

## Project Structure

```
~/gate_prep/
├── app.py                   # Flask factory, blueprint registration, auto-browser-open
├── config.py                # Subjects, difficulty levels, badge thresholds, XP values, wizard theme copy
├── .env                     # ANTHROPIC_API_KEY=sk-...
├── requirements.txt
├── run.sh                   # Double-click launcher
├── database/
│   ├── db.py                # SQLite connection, init_db(), schema DDL
│   └── gate_prep.db         # Auto-created on first run
├── modules/
│   ├── claude_client.py     # Thin wrapper: chat() and stream() helpers
│   ├── quiz.py              # generate_question(), save_attempt(), get_weak_topics()
│   ├── exam.py              # create_session(), generate_batch(), submit_answer(), finalise()
│   ├── writing.py           # build_skill_lesson(), coach_revision(), review_full_task() — writing coaching module
│   ├── explain.py           # explain_topic() with SSE streaming
│   ├── progress.py          # Dashboard data, streaks, XP, badge evaluation
│   └── hints.py             # get_hint() with session caching, hint cost logic
├── routes/
│   ├── quiz_routes.py
│   ├── exam_routes.py
│   ├── writing_routes.py
│   ├── explain_routes.py
│   ├── progress_routes.py
│   ├── parent_routes.py     # /parent/* — parent dashboard (no PIN)
│   └── api_routes.py        # AJAX JSON endpoints
├── templates/
│   ├── base.html            # Master layout: wizard nav, XP bar, spell-book icon
│   ├── login.html           # Profile selection screen (shown on first load)
│   ├── home.html            # Wizard home: daily streak, spell categories, XP level
│   ├── quiz/                # subject_select.html, question.html, results.html
│   ├── exam/                # start.html, in_progress.html, review.html
│   ├── writing/             # mode_select.html, lesson.html, editor.html, feedback.html
│   ├── explain/             # ask.html (typewriter SSE output)
│   ├── progress/            # dashboard.html (charts, spell-book of badges)
│   └── parent/              # overview.html, profile_detail.html
└── static/
    ├── css/style.css        # Wizard palette (deep purple, gold, teal), large fonts
    ├── js/
    │   ├── timer.js         # Countdown, colour change at 5m/2m
    │   ├── quiz.js          # Hint reveal, XP pop animation
    │   ├── exam.js          # Auto-submit, answer AJAX, question navigator
    │   ├── writing.js       # Mode flow, draft autosave, revision loop, submit + stream coaching feedback
    │   ├── charts.js        # Canvas 2D bar/line/radar charts (no library)
    │   └── rewards.js       # Magic sparkle confetti, spell-unlock modal
    └── img/                 # wizard.svg, spellbook.svg, potion.svg, badge icons
```

---

## SQLite Schema

```sql
-- Child profiles (multi-user support)
profiles          -- id, name, avatar_colour, created_at, current_xp, current_level

-- Practice & exam activity (all include profile_id)
quiz_attempts     -- profile_id, subject, topic, correct, hints_used, xp_earned, attempted_at
exam_sessions     -- profile_id, subject, duration, score, max_score, percentage, status
exam_questions    -- session_id, question_index, text, options_json, correct, user_answer, explanation
writing_sessions  -- profile_id, session_type, target_skill, prompt_text, outline_notes, draft_v1, revision_instruction, draft_v2, feedback_summary_json, xp_earned, created_at
daily_activity    -- profile_id, activity_date (UNIQUE per profile), quiz_count, exam_count, xp_earned

-- Progress & rewards (all include profile_id)
badges            -- profile_id, badge_key, badge_name, tier (bronze/silver/gold), earned_at
subject_stats     -- profile_id + subject (composite PK), total_attempts, correct, total_xp, best_streak
```

All tables use `profile_id` so progress is completely isolated between child profiles.

---

## Claude API Integration Points

| Feature | When Called | Approach |
|---|---|---|
| Practice question (MCQ) | Each "New Question" click | Single call → JSON: question/options/answer/explanation/topic |
| Exam batch | Exam start | One call → JSON array of N questions (pre-loaded before timer starts) |
| Writing skill lesson | Kid starts a `skill_drill` session | Claude chat() → structured mini-lesson with goal, rule, strong/weak examples, and a short exercise |
| Writing revision coaching | Kid submits a short drill or guided draft | Streaming SSE text call → one strength, one priority issue, one revision instruction, optional model example |
| Writing full-task scene | Kid starts a `full_task` session | Claude chat() → scene description; optional DALL-E image generation only for full writing tasks |
| DALL-E 3 image generation | After full-task scene description | `openai.images.generate(model="dall-e-3")` → URL → saved as PNG locally for staged full tasks only |
| Writing full-task review | Kid submits a complete composition | Streaming SSE multimodal call (image + text when present) → coaching-style response with strengths, top issue, and revision direction |
| Topic explainer | Kid submits a question | Streaming SSE → typewriter effect, Year 5 language, ends with "Did you know?" |
| Hints | "Need a hint?" click | Single call, cached in Flask session by question_hash, 2 levels |

**Abstract Reasoning** questions are text-based: Claude generates sequences using Unicode symbols (●, ■, ▲, ★) and describes spatial patterns in words. This works well for 10-year-olds without needing image generation.

**Writing coaching feedback** JSON structure:
```json
{
  "strength": "Your opening creates immediate curiosity and gives the scene a clear mood.",
  "priority_issue": "The middle jumps too quickly from discovery to ending, so the tension fades.",
  "revision_instruction": "Add 2-3 sentences showing what the character notices, decides, and risks before the final event.",
  "model_example": "Instead of 'He was scared', try showing it through action or dialogue.",
  "next_step": "Rewrite the middle paragraph before moving to the ending."
}
```

---

## Key Feature Details

### Wizard Theme Language
All game copy uses fantasy framing — never feels like "studying":

| App concept | Wizard framing |
|---|---|
| Practice quiz | "Cast a spell" |
| Exam | "The Grand Tournament" |
| Questions | "Challenges" / "Riddles" |
| Correct answer | "Spell successful!" |
| Wrong answer | "The spell fizzled... but wizards learn from mistakes!" |
| Hint | "Consult the Ancient Scroll" |
| XP points | "Magic Points (MP)" |
| Level up | "Your wizard grows more powerful!" |
| Streak | "Days of magical practice" |
| Progress dashboard | "The Wizard's Tome" |
| Topic explainer | "Ask the Oracle" |
| Creative writing | "The Storytelling Cauldron" |
| Badge | "Spells Mastered" |

### Quiz Session Length
Kid picks **5, 10, or 15 questions** at the start of each practice session from a friendly card selection screen. Default is 10.

### Exam Simulator
- Subject + duration (20 or 40 min) + question count selection → "The Grand Tournament begins!"
- Batch question generation with an animated cauldron loading screen
- Countdown timer: green → amber at 5 min → red at 2 min + warning modal
- Question navigator panel (filled crystal = answered, empty crystal = unanswered)
- Answers saved via AJAX, correctness hidden until review
- Auto-submit when timer hits zero
- Scoring: 10 MP/correct, −3 MP/hint, +2 MP speed bonus (<60s)
- Review page: green/red highlights + explanation + "Practice this spell" button

### Creative Writing ("Storytelling Cauldron")

Writing should behave like a **coaching system**, not a one-shot scoring machine. The three objective units can keep the current drill-and-upgrade loop, but Writing uses a separate training model built around skill growth and revision.

#### Writing Module Redesign Principles

- The goal is to improve writing ability, not simulate an opaque automatic marker
- Daily training prioritises:
  - prompt interpretation
  - idea selection and angle
  - structure and paragraph flow
  - detail and specificity
  - `show, not tell`
  - revision and rewriting
- Claude acts as a coach:
  - generates scaffolds
  - provides strong/weak examples
  - gives one concrete revision instruction
  - guides the student into a second attempt
- Claude does not act as:
  - the default total-score judge
  - a substitute for formal human assessment
  - the sole source of writing growth decisions

#### Writing Skill Areas

- `idea_generation`
- `prompt_interpretation`
- `structure_and_organisation`
- `expression_and_style`
- `show_not_tell`
- `revision_and_improvement`
- `language_control`

Each area should support:
- standalone drills
- targeted feedback
- lightweight progress tracking over time

#### Three Writing Modes

**1. `micro_skill_drill`**

- Default daily mode, 5-8 minutes
- Trains one narrow skill at a time
- Example tasks:
  - rewrite a telling sentence into a showing sentence
  - choose the stronger story angle from two options
  - improve a weak opening hook
  - add sensory detail to a flat paragraph
  - vary sentence openings

**2. `guided_writing`**

- Mid-length coached session, 10-15 minutes
- Student writes part of a composition, not necessarily a full piece
- Example tasks:
  - write only the opening
  - plan the middle conflict
  - turn notes into a paragraph
  - improve an ending
  - build an outline from a cue

**3. `full_task`**

- Stage-check mode, not the default daily loop
- Preserves ASET-style full composition practice
- Used to test transfer after skill work has been done

#### Writing Training Loop

1. Choose a target skill
2. Show a concise mini-lesson with one strong and one weak example
3. Give a short writing task
4. Return one strength and one priority issue
5. Give one specific revision instruction
6. Ask the student to rewrite immediately
7. Compare draft v1 and draft v2
8. Update lightweight skill progress
9. Periodically route the student into a `full_task`

This loop replaces the old "write once -> receive a score -> stop" pattern.

#### Feedback Contract

Writing feedback should default to:
- one strength
- one priority issue
- one revision instruction
- optional model example
- optional retry / rewrite step

The UI should not lead with rubric scores. Any rubric-style scoring belongs to staged `full_task` review only, and even there it should remain secondary to revision guidance.

#### Image Prompts: Retained but Downgraded

- Image prompts remain available for `full_task`
- They are not the default entry point for all writing sessions
- `micro_skill_drill` and `guided_writing` should work without image generation
- When used, the image is a support for idea generation, not the main value of the module

#### API Call Sequences

**`micro_skill_drill`**
```
1. Claude chat()       → mini-lesson JSON (goal, rule, examples, short task)
2. Display lesson + short response input
3. On submit: Claude chat(student_text) → streaming coaching JSON
4. Student rewrites
5. Save draft_v1, revision_instruction, draft_v2, feedback_summary_json
```

**`guided_writing`**
```
1. Claude chat()       → guided prompt + scaffold or outline frame
2. Display writing frame + textarea
3. On submit: Claude chat(student_text) → streaming coaching JSON
4. Student revises selected section
5. Save outline_notes, draft_v1, draft_v2, feedback_summary_json
```

**`full_task`**
```
1. Claude chat()          → full-task prompt or optional scene description
2. Optional DALL-E 3      → image URL → saved to static/writing_images/<session_id>.png
3. Display full task + textarea
4. On submit: Claude chat([image, student_text]) → streaming coaching review JSON
```

**Additions to tech stack:**
- Keep `openai` pip package + `OPENAI_API_KEY` in `.env` only for staged `full_task` image generation
- Keep `modules/image_gen.py` limited to optional `full_task` scenes
- Keep `static/writing_images/` for locally saved generated PNGs when image prompts are used
- `writing_sessions` should store: `session_type`, `target_skill`, `prompt_text`, `outline_notes`, `draft_v1`, `revision_instruction`, `draft_v2`, `feedback_summary_json`

### Hints ("Ancient Scroll")
- 2 scrolls per question: scroll 1 = guiding question, scroll 2 = eliminate one wrong option + strategy
- Cached in Flask session by question_hash (no duplicate API calls)
- Practice mode: free but flagged in stats; Exam mode: costs 3 MP
- Parchment scroll slide-in UI with quill icon

### XP & Levelling (replaces raw points)
- XP accumulates across all activities per profile
- Wizard Levels 1–20 with themed titles (e.g. Level 1: Apprentice, Level 5: Spell-Weaver, Level 10: Archmage, Level 20: Grand Wizard)
- Level-up triggers a full-page animated sparkle burst + new title reveal
- XP bar visible in the nav on every page

### Rewards & Badges ("Spells Mastered")
- Stars (1–5 ✦) at end of each quiz/exam, animated pop-in
- Daily streak counter with flame icon on home screen
- Badges in Bronze/Silver/Gold with wizard-themed names:
  - **Number Sorcerer** — Quantitative Reasoning mastery
  - **Pattern Prophet** — Abstract Reasoning mastery
  - **Word Weaver** — Reading Comprehension mastery
  - **Story Enchanter** — Writing coaching milestones and revision persistence
  - **Speed Caster** — questions answered in <45s
  - **Perfect Potion** — 100% quiz score
  - **Tournament Victor** — exam scores
  - **Daily Devotion** — streak badges
- Badge earned → magic sparkle confetti (pure CSS/JS) + spell-unlock modal
- Wizard's Tome page shows all mastered spells (badges) and locked ones (silhouette)

### Parent Dashboard (`/parent`)
- No PIN — accessible from nav bar
- Side-by-side profile cards showing: level, XP, weekly activity, subject breakdown
- Per-profile drill-down: score history chart, badge list, weak topics
- "Set weekly goal" — parent can set a target number of practice sessions per week (stored in `profiles` table, displayed as a progress ring on the kid's home screen)

### Progress Dashboard ("Wizard's Tome")
- Canvas 2D bar chart: XP per subject
- Canvas 2D line chart: score trend over time
- Radar chart: accuracy across all 4 WA GATE subjects
- Badge shelf with mastered/locked spells
- Session history table

---

## Installation Steps

```bash
mkdir ~/gate_prep && cd ~/gate_prep
python3 -m venv venv && source venv/bin/activate
pip install flask>=2.3 anthropic>=0.25 python-dotenv>=1.0
# Create .env with ANTHROPIC_API_KEY=sk-ant-...
python app.py   # auto-opens browser at http://127.0.0.1:5000
```

`run.sh` launcher for the kid/parent to double-click in Finder.

---

## Critical Files (Implementation Order)

1. `database/db.py` — full schema with `profile_id` on all tables
2. `config.py` — WA GATE subjects, wizard levels/titles, badge thresholds, theme copy
3. `modules/claude_client.py` — chat() and stream() wrappers
4. `app.py` — Flask factory, blueprints, auto-browser-open
5. `templates/login.html` + `routes/api_routes.py` (profile create/select) — must come before anything else
6. `templates/base.html` + `static/css/style.css` — wizard palette, XP bar in nav
7. `modules/quiz.py` + `routes/quiz_routes.py` + `static/js/quiz.js`
8. `modules/exam.py` + `routes/exam_routes.py` + `static/js/exam.js`
9. `modules/writing.py` + `routes/writing_routes.py` + `static/js/writing.js` — implement coaching modes before full-task review polish
10. `modules/explain.py` + SSE route in `explain_routes.py`
11. `modules/hints.py` + `static/js/rewards.js` (XP/level-up/badges)
12. `modules/progress.py` + `static/js/charts.js` + `templates/progress/dashboard.html`
13. `routes/parent_routes.py` + `templates/parent/` — parent dashboard last

---

## Verification

1. `python app.py` → browser opens at `http://127.0.0.1:5000` → login/profile screen shown
2. Create a new wizard profile → enter name → routed to wizard home page with XP bar
3. Choose "Abstract Reasoning" → pick 5 questions → complete quiz → XP animation + star rating shown
4. Tap "Ancient Scroll" hint on a question → parchment slide-in appears; tap again → scroll 2 appears
5. Start a 20-minute Grand Tournament → cauldron loading screen → timer counts down → submit → review with green/red answers
6. Visit "Storytelling Cauldron" → choose `micro_skill_drill` or `guided_writing` → complete draft v1 → receive one strength + one revision instruction → submit draft v2 → full-task image flow remains available only in staged mode
7. Visit "Ask the Oracle" → type a topic question → text streams in typewriter style
8. Check "Wizard's Tome" → bar/line/radar charts render, badge shelf shows earned spells
9. Level up by earning XP → full-page sparkle burst + new wizard title displayed
10. Open `/parent` → see all profiles side-by-side with activity breakdown
11. Create a second profile → confirm all progress is completely separate
