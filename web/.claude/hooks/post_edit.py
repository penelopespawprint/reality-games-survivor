#!/usr/bin/env python3
"""
PostToolUse (Edit|Write): After edits, check complexity + remind to update state.
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
        tool_response = input_data.get('tool_response', {})
        file_path = tool_input.get('file_path', '')
        
        # Don't check persistence files
        if any(p in file_path for p in PERSISTENCE_FILES):
            sys.exit(0)
        
        warnings = []
        
        # Check file size for new writes
        content = tool_input.get('content', '')
        if content and len(content.split('\n')) > 200:
            warnings.append("**COMPLEXITY TAX:** This file is >200 lines. Can it be split? Large files are where bugs hide.")
        
        # Check if state needs updating
        state_file = os.path.join(project_dir, 'SESSION_STATE.md')
        if os.path.exists(state_file):
            mtime = datetime.fromtimestamp(os.path.getmtime(state_file))
            if datetime.now() - mtime > timedelta(minutes=5):
                warnings.append("**PERSISTENCE:** Update SESSION_STATE.md with current progress. Update DECISIONS.md if you made any calls.")
        
        if warnings:
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": "\n\n".join(warnings)
                }
            }
            print(json.dumps(output))
    except Exception:
        pass
    
    sys.exit(0)

if __name__ == "__main__":
    main()
