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
| **Creative Writing** | Open text — kid types response to an AI-generated image prompt, Claude reviews | DALL-E 3 generates a scene image → kid writes a story inspired by it → Claude gives scored feedback |

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
│   ├── writing.py           # generate_prompt(), evaluate_writing() — creative writing module
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
│   ├── writing/             # prompt.html, editor.html, feedback.html
│   ├── explain/             # ask.html (typewriter SSE output)
│   ├── progress/            # dashboard.html (charts, spell-book of badges)
│   └── parent/              # overview.html, profile_detail.html
└── static/
    ├── css/style.css        # Wizard palette (deep purple, gold, teal), large fonts
    ├── js/
    │   ├── timer.js         # Countdown, colour change at 5m/2m
    │   ├── quiz.js          # Hint reveal, XP pop animation
    │   ├── exam.js          # Auto-submit, answer AJAX, question navigator
    │   ├── writing.js       # Word count, autosave to session, submit + stream feedback
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
writing_sessions  -- profile_id, prompt_text, user_response, ai_feedback_json, xp_earned, created_at
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
| Writing image description | "Get a new scene" click | Claude chat() → vivid scene description text → passed to DALL-E 3 |
| DALL-E 3 image generation | After Claude description | `openai.images.generate(model="dall-e-3")` → URL → saved as PNG locally |
| Writing feedback | Kid submits writing | Streaming SSE multimodal call (image + text) → structured feedback: Ideas/Structure/Language ✦✦✦✦✦ + praise + tip |
| Topic explainer | Kid submits a question | Streaming SSE → typewriter effect, Year 5 language, ends with "Did you know?" |
| Hints | "Need a hint?" click | Single call, cached in Flask session by question_hash, 2 levels |

**Abstract Reasoning** questions are text-based: Claude generates sequences using Unicode symbols (●, ■, ▲, ★) and describes spatial patterns in words. This works well for 10-year-olds without needing image generation.

**Creative Writing feedback** JSON structure:
```json
{
  "scores": {"ideas": 4, "structure": 3, "language": 5},
  "praise": "Your opening sentence was magical — it pulled me straight in!",
  "tip": "Try adding one more detail about how your character felt inside.",
  "xp_earned": 35
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

**Image-first prompt flow** — a DALL-E 3 generated image IS the prompt:

1. Kid clicks "Get a new scene" → Claude generates a short vivid image description tuned for Year 5 creative writing (e.g. *"A lone wizard standing at the edge of a glowing forest at dusk, a mysterious door in an ancient tree"*)
2. That description is sent to **DALL-E 3** → 1024×1024 image generated and displayed prominently
3. A short cue appears under the image (*"Write a story about what happens next…"*) — type (narrative / descriptive / persuasive) chosen by Claude to match WA GATE variety
4. Kid types response in textarea with live word count (target 150–250 words)
5. Autosaved to Flask session every 30 seconds
6. Submit → Claude reviews writing **with the image as context** (multimodal call), streams back:
   - **Ideas & Imagination** ✦✦✦✦✦
   - **Structure** ✦✦✦✦✦
   - **Language & Word Choice** ✦✦✦✦✦
   - Specific praise + one concrete improvement tip
7. XP awarded based on average score (max 50 MP per session)

**API call sequence:**
```
1. Claude chat()          → image description text
2. DALL-E 3 generate()    → image URL → immediately saved to static/writing_images/<session_id>.png
3. Display image + textarea
4. On submit: Claude chat([image, student_text]) → streaming feedback JSON
```

**Additions to tech stack:**
- New dependency: `openai` pip package + `OPENAI_API_KEY` in `.env`
- New module: `modules/image_gen.py` — wraps `openai.OpenAI().images.generate(model="dall-e-3")`
- New folder: `static/writing_images/` — stores downloaded PNGs (DALL-E URLs expire in 1 hour)
- `writing_sessions` table stores: `image_url` (local path), `image_description`, `user_response`, `ai_feedback_json`

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
  - **Story Enchanter** — Creative Writing mastery
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
9. `modules/writing.py` + `routes/writing_routes.py` + `static/js/writing.js`
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
6. Visit "Storytelling Cauldron" → click "Get a new scene" → DALL-E 3 image appears → type 150+ words → submit → streaming AI feedback with ✦ scores and image-aware praise
7. Visit "Ask the Oracle" → type a topic question → text streams in typewriter style
8. Check "Wizard's Tome" → bar/line/radar charts render, badge shelf shows earned spells
9. Level up by earning XP → full-page sparkle burst + new wizard title displayed
10. Open `/parent` → see all profiles side-by-side with activity breakdown
11. Create a second profile → confirm all progress is completely separate
