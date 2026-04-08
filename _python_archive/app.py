"""
Thinkering Quill — WA GATE Prep App
Flask application factory. Run with: python app.py
"""
import os
import threading
import webbrowser
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, redirect, url_for, session
from database.db import init_db, close_db

# ── Route blueprints ──────────────────────────────────────────────────────────
from routes.profile_routes  import profile_bp
from routes.quiz_routes     import quiz_bp
from routes.exam_routes     import exam_bp
from routes.writing_routes  import writing_bp
from routes.explain_routes  import explain_bp
from routes.progress_routes import progress_bp
from routes.parent_routes   import parent_bp
from routes.api_routes      import api_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-in-production")

    # Register blueprints
    app.register_blueprint(profile_bp)
    app.register_blueprint(quiz_bp,      url_prefix="/quiz")
    app.register_blueprint(exam_bp,      url_prefix="/exam")
    app.register_blueprint(writing_bp,   url_prefix="/writing")
    app.register_blueprint(explain_bp,   url_prefix="/explain")
    app.register_blueprint(progress_bp,  url_prefix="/progress")
    app.register_blueprint(parent_bp,    url_prefix="/parent")
    app.register_blueprint(api_bp,       url_prefix="/api")

    # Teardown
    app.teardown_appcontext(close_db)

    @app.route("/")
    def index():
        if "profile_id" not in session:
            return redirect(url_for("profile.login"))
        return redirect(url_for("quiz.home"))

    return app


if __name__ == "__main__":
    print("\n✨ Thinkering Quill — WA GATE Prep App")
    print("=" * 42)

    init_db()

    app = create_app()

    # Auto-open browser after a short delay
    def open_browser():
        import time; time.sleep(1.2)
        webbrowser.open("http://127.0.0.1:5000")
    threading.Thread(target=open_browser, daemon=True).start()

    print("  ✓ Opening browser at http://127.0.0.1:5000")
    print("  ✓ Press Ctrl+C to stop\n")
    app.run(debug=True, use_reloader=False)
