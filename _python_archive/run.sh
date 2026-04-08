#!/bin/bash
# Thinkering Quill launcher — double-click in Finder to start
cd "$(dirname "$0")"
source venv/bin/activate 2>/dev/null || true
python app.py
