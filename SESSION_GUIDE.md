# ClaudePad Session Guide

Quick reference for Claude to ensure proper session documentation.

## Session Start

Simply begin the conversation. Claude should:
- Engage naturally in design discussion
- Ask clarifying questions
- Document decisions in real-time

## Session End Protocol

When the user indicates the session is ending (or ~30-45 minutes have passed), Claude should:

### 1. Create Raw Conversation Transcript

**File**: `conversations/raw/YYYY-MM-DD_topic-slug.md`

```markdown
# Conversation: [Topic]
**Date**: YYYY-MM-DD
**Participants**: Claude + User

[Complete conversation transcript]
```

### 2. Generate Conversation Summary

**File**: `conversations/summaries/YYYY-MM-DD_topic-slug_summary.md`

Use `templates/summary_template.md` to create:
- Context and discussion points
- Key decisions made
- Open questions
- Action items
- Links to artifacts

### 3. Create Implementation Artifacts

**File**: `artifacts/[type]_topic-slug.md`

Choose appropriate type:
- `spec_` - Technical specification (use `templates/spec_template.md`)
- `prd_` - Product requirements
- `design_` - UI/UX specifications
- `architecture_` - System architecture

Artifacts should be:
- **Implementation-ready**: Detailed enough for developers or AI agents
- **Self-contained**: Include all necessary context
- **Actionable**: Clear requirements and acceptance criteria

### 4. Workspace Cleanup

- Remove any temporary files created during session
- Keep directory structure clean
- Ensure all documentation is properly organized

## Topic Slug Format

Convert conversation topic to URL-friendly slug:
- Lowercase
- Replace spaces with hyphens
- Remove special characters

Examples:
- "User Authentication Redesign" → `user-authentication-redesign`
- "Payment API Integration" → `payment-api-integration`
- "Mobile App Architecture" → `mobile-app-architecture`

## Quality Checklist

Before ending session:
- [ ] Raw conversation saved with complete context
- [ ] Summary captures all key decisions
- [ ] Artifacts are implementation-ready
- [ ] All files follow naming conventions
- [ ] Workspace is clean (no temp files)
- [ ] Links between documents are working

## Notes

- Conversations don't need to be committed to git unless valuable for long-term reference
- Artifacts should generally be committed as they're meant for implementation
- If session is interrupted, create checkpoint summary even if incomplete
- Multiple artifacts can be created from a single conversation if needed
