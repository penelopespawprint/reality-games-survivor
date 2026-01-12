#!/usr/bin/env python3
"""
SessionStart: Load persistence files + inject Parkinson's Buster + Exit Criteria
"""
import json
import sys
import os

FILES = ['CLAUDE.md', 'SESSION_STATE.md', 'DECISIONS.md']

SESSION_PRIMER = """
=== SESSION PRIMER ===

**PARKINSON'S BUSTER:** You have half the time you think you need. What do you cut? What's the minimum viable path?

**EXIT CRITERIA:** Before doing anything, write down: "I am done when ___." If you can't complete that sentence, clarify with the user first.

Now proceed.
"""

def main():
    try:
        input_data = json.load(sys.stdin)
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
        
        parts = []
        for filename in FILES:
            path = os.path.join(project_dir, filename)
            if os.path.exists(path):
                with open(path, 'r') as f:
                    content = f.read().strip()
                    if content:
                        parts.append(f"=== {filename} ===\n{content}")
        
        parts.append(SESSION_PRIMER)
        
        output = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": "\n\n".join(parts)
            }
        }
        print(json.dumps(output))
    except Exception:
        pass
    
    sys.exit(0)

if __name__ == "__main__":
    main()
