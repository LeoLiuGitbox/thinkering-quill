"""
SQLite database helper.
All tables include profile_id so progress is fully isolated per child.
"""
import sqlite3
from pathlib import Path
from flask import g

DB_PATH = Path(__file__).parent / "gate_prep.db"


def get_db():
    """Return a thread-local SQLite connection."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create all tables if they don't exist. Safe to call on every startup."""
    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript("""
        -- ── Profiles ──────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS profiles (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT    NOT NULL,
            avatar_colour   TEXT    NOT NULL DEFAULT '#7c3aed',
            current_xp      INTEGER NOT NULL DEFAULT 0,
            weekly_goal     INTEGER NOT NULL DEFAULT 5,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- ── Practice Quiz Attempts ────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id      INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            subject         TEXT    NOT NULL,
            topic           TEXT,
            question_hash   TEXT    NOT NULL,
            question_text   TEXT    NOT NULL,
            options_json    TEXT    NOT NULL,
            correct_answer  TEXT    NOT NULL,
            user_answer     TEXT,
            is_correct      INTEGER NOT NULL DEFAULT 0,
            used_hint       INTEGER NOT NULL DEFAULT 0,
            hints_used      INTEGER NOT NULL DEFAULT 0,
            xp_earned       INTEGER NOT NULL DEFAULT 0,
            time_taken_secs INTEGER,
            attempted_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- ── Exam Sessions ─────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS exam_sessions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id       INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            subject          TEXT    NOT NULL,
            duration_minutes INTEGER NOT NULL,
            num_questions    INTEGER NOT NULL,
            started_at       TEXT    NOT NULL DEFAULT (datetime('now')),
            completed_at     TEXT,
            total_xp         INTEGER,
            max_xp           INTEGER,
            percentage       REAL,
            status           TEXT    NOT NULL DEFAULT 'in_progress'
        );

        -- ── Exam Questions ────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS exam_questions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id      INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
            question_index  INTEGER NOT NULL,
            question_text   TEXT    NOT NULL,
            options_json    TEXT    NOT NULL,
            correct_answer  TEXT    NOT NULL,
            explanation     TEXT    NOT NULL,
            topic           TEXT,
            difficulty      TEXT    NOT NULL,
            user_answer     TEXT,
            is_correct      INTEGER,
            time_taken_secs INTEGER,
            used_hint       INTEGER NOT NULL DEFAULT 0
        );

        -- ── Creative Writing Sessions ─────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS writing_sessions (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id          INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            image_description   TEXT    NOT NULL,
            image_path          TEXT,
            writing_type        TEXT    NOT NULL,
            prompt_cue          TEXT    NOT NULL,
            user_response       TEXT,
            ai_feedback_json    TEXT,
            xp_earned           INTEGER NOT NULL DEFAULT 0,
            created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- ── Daily Activity ────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS daily_activity (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id      INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            activity_date   TEXT    NOT NULL,
            quiz_count      INTEGER NOT NULL DEFAULT 0,
            exam_count      INTEGER NOT NULL DEFAULT 0,
            writing_count   INTEGER NOT NULL DEFAULT 0,
            xp_earned       INTEGER NOT NULL DEFAULT 0,
            UNIQUE(profile_id, activity_date)
        );

        -- ── Badges ───────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS badges (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            badge_key   TEXT    NOT NULL,
            tier        TEXT    NOT NULL,
            earned_at   TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(profile_id, badge_key, tier)
        );

        -- ── Subject Stats ─────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS subject_stats (
            profile_id       INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            subject          TEXT    NOT NULL,
            total_attempts   INTEGER NOT NULL DEFAULT 0,
            correct_attempts INTEGER NOT NULL DEFAULT 0,
            total_xp         INTEGER NOT NULL DEFAULT 0,
            best_streak      INTEGER NOT NULL DEFAULT 0,
            last_practiced   TEXT,
            PRIMARY KEY (profile_id, subject)
        );

        -- ── Indexes ──────────────────────────────────────────────────────────
        CREATE INDEX IF NOT EXISTS idx_attempts_profile  ON quiz_attempts(profile_id);
        CREATE INDEX IF NOT EXISTS idx_attempts_subject  ON quiz_attempts(profile_id, subject);
        CREATE INDEX IF NOT EXISTS idx_attempts_date     ON quiz_attempts(attempted_at);
        CREATE INDEX IF NOT EXISTS idx_exam_profile      ON exam_sessions(profile_id);
        CREATE INDEX IF NOT EXISTS idx_exam_questions    ON exam_questions(session_id);
        CREATE INDEX IF NOT EXISTS idx_writing_profile   ON writing_sessions(profile_id);
        CREATE INDEX IF NOT EXISTS idx_activity_profile  ON daily_activity(profile_id, activity_date);
        CREATE INDEX IF NOT EXISTS idx_badges_profile    ON badges(profile_id);
    """)
    db.commit()
    db.close()
    print(f"  ✓ Database ready at {DB_PATH}")
