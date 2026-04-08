"""
Central configuration for the Thinkering Quill GATE Prep App.
WA GATE (Western Australia) — Year 5 → Year 7 selective entry.
"""

# ── AI Models ─────────────────────────────────────────────────────────────────
CLAUDE_MODEL  = "claude-sonnet-4-6"
DALLE_MODEL   = "dall-e-3"
DALLE_SIZE    = "1024x1024"

# ── WA GATE Subjects ──────────────────────────────────────────────────────────
SUBJECTS = [
    "Abstract Reasoning",
    "Quantitative Reasoning",
    "Reading Comprehension",
    "Creative Writing",
]

SUBJECT_ICONS = {
    "Abstract Reasoning":    "🔮",
    "Quantitative Reasoning": "⚗️",
    "Reading Comprehension":  "📜",
    "Creative Writing":       "🪄",
}

SUBJECT_SPELLS = {
    "Abstract Reasoning":    "Pattern Sight",
    "Quantitative Reasoning": "Number Alchemy",
    "Reading Comprehension":  "Word Weaving",
    "Creative Writing":       "Story Enchantment",
}

# ── Difficulty Levels ─────────────────────────────────────────────────────────
DIFFICULTY_LEVELS = ["Apprentice", "Journeyman", "Archmage"]

# ── Quiz Session Lengths ──────────────────────────────────────────────────────
QUIZ_LENGTHS   = [5, 10, 15]
DEFAULT_QUIZ_LENGTH = 10

# ── Exam Configurations ───────────────────────────────────────────────────────
EXAM_CONFIGS = {
    20: {"label": "Quick Tournament", "questions": 10},
    40: {"label": "Grand Tournament",  "questions": 20},
}

# ── XP / Scoring ─────────────────────────────────────────────────────────────
XP_CORRECT          = 10   # per correct MCQ answer
XP_HINT_PENALTY     = 3    # deducted per hint used
XP_SPEED_BONUS      = 2    # bonus if answered in < 45s
XP_WRITING_MAX      = 50   # max XP per writing session
XP_EXPLAIN_BONUS    = 5    # XP for using the Oracle

# ── Wizard Levels ─────────────────────────────────────────────────────────────
WIZARD_LEVELS = [
    (0,     "Apprentice"),
    (100,   "Spell-Seeker"),
    (250,   "Rune Reader"),
    (500,   "Potion Brewer"),
    (850,   "Charm Caster"),
    (1300,  "Spell-Weaver"),
    (1900,  "Mystic Scholar"),
    (2700,  "Arcane Adept"),
    (3700,  "Shadow Mage"),
    (5000,  "Archmage"),
    (7000,  "Grand Wizard"),
    (9999,  "Legendary Sorcerer"),
]

def get_wizard_level(xp: int) -> tuple[int, str]:
    """Return (level_number, title) for a given XP total."""
    level = 1
    title = WIZARD_LEVELS[0][1]
    for i, (threshold, name) in enumerate(WIZARD_LEVELS):
        if xp >= threshold:
            level = i + 1
            title = name
        else:
            break
    return level, title

def xp_to_next_level(xp: int) -> tuple[int, int]:
    """Return (xp_needed_for_next, xp_at_next_level)."""
    for i, (threshold, _) in enumerate(WIZARD_LEVELS):
        if xp < threshold:
            prev = WIZARD_LEVELS[i - 1][0] if i > 0 else 0
            return threshold - xp, threshold
    return 0, xp  # max level

# ── Badges ────────────────────────────────────────────────────────────────────
BADGES = {
    # key: (name, description, subject_filter, thresholds: {bronze, silver, gold})
    "number_sorcerer": (
        "Number Sorcerer", "Master of Quantitative Reasoning",
        "Quantitative Reasoning",
        {"bronze": 50, "silver": 200, "gold": 500},
    ),
    "pattern_prophet": (
        "Pattern Prophet", "Master of Abstract Reasoning",
        "Abstract Reasoning",
        {"bronze": 50, "silver": 200, "gold": 500},
    ),
    "word_weaver": (
        "Word Weaver", "Master of Reading Comprehension",
        "Reading Comprehension",
        {"bronze": 50, "silver": 200, "gold": 500},
    ),
    "story_enchanter": (
        "Story Enchanter", "Master of Creative Writing",
        "Creative Writing",
        {"bronze": 3, "silver": 10, "gold": 25},   # writing sessions
    ),
    "speed_caster": (
        "Speed Caster", "Answer 10 questions in under 45 seconds each",
        None,
        {"bronze": 10, "silver": 50, "gold": 150},
    ),
    "perfect_potion": (
        "Perfect Potion", "Score 100% on a quiz",
        None,
        {"bronze": 1, "silver": 5, "gold": 15},
    ),
    "tournament_victor": (
        "Tournament Victor", "Complete the Grand Tournament",
        None,
        {"bronze": 1, "silver": 5, "gold": 10},
    ),
    "daily_devotion": (
        "Daily Devotion", "Practice every day",
        None,
        {"bronze": 7, "silver": 14, "gold": 30},   # streak days
    ),
}

# ── Encouragement Messages ────────────────────────────────────────────────────
CORRECT_MESSAGES = [
    "Brilliant spell cast! ✨",
    "The magic flows through you!",
    "Perfect incantation! 🌟",
    "You nailed it, wizard!",
    "Your spellbook grows stronger!",
    "Ancient magic recognises your skill!",
    "Extraordinary! The stars align!",
    "That brain is a powerful wand! 🧠",
    "Flawless! The sorcerers are impressed!",
    "You're on fire! 🔥",
]

WRONG_MESSAGES = [
    "Even Merlin got it wrong sometimes! Check the scroll below.",
    "The spell fizzled… but wizards learn from mistakes!",
    "Close! Read the ancient wisdom below.",
    "Not quite — the explanation will help you next time!",
    "Every mistake makes you wiser. See why below. 📜",
]

STREAK_MESSAGES = {
    3:  "3 days of magic! You're building real power! 🔥",
    7:  "A full week! You're becoming a true wizard! ⚡",
    14: "Two weeks straight! The Grand Council is watching! 🌙",
    30: "30 DAYS! You have achieved LEGENDARY status! 🏆",
}
