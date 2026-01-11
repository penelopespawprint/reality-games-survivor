#!/usr/bin/env python3
"""
PostToolUse: After Edit/Write, remind to update SESSION_STATE.md/DECISIONS.md.
"""
import json
import sys
import os
from datetime import datetime, timedelta

PERSISTENCE_FILES = ['SESSION_STATE.md', 'DECISIONS.md', 'CLAUDE.md']

def main():
    try:
        input_data = json.load(sys.stdin)
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
        
        tool_input = input_data.get('tool_input', {})
        file_path = tool_input.get('file_path', '')
        
        # Don't remind if we just edited a persistence file
        if any(p in file_path for p in PERSISTENCE_FILES):
            sys.exit(0)
        
        state_file = os.path.join(project_dir, 'SESSION_STATE.md')
        if not os.path.exists(state_file):
            sys.exit(0)
        
        # Check if state was updated in last 3 minutes
        mtime = datetime.fromtimestamp(os.path.getmtime(state_file))
        if datetime.now() - mtime > timedelta(minutes=3):
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": "Remember: Update SESSION_STATE.md and DECISIONS.md if needed."
                }
            }
            print(json.dumps(output))
    except Exception:
        pass
    
    sys.exit(0)

if __name__ == "__main__":
    main()
