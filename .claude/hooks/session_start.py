#!/usr/bin/env python3
"""
SessionStart: Load CLAUDE.md, SESSION_STATE.md, DECISIONS.md into context.
"""
import json
import sys
import os

FILES = ['CLAUDE.md', 'SESSION_STATE.md', 'DECISIONS.md']

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
        
        if parts:
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
