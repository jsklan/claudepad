# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

ClaudePad is a design workspace and discussion hub for feature planning and specification development. It serves as a conversation space for:
- Design discussions and feature exploration
- Requirements discovery and architecture planning
- Creating implementation-ready specifications (specs, PRDs, design docs)

The artifacts created here are meant to be used with Claude Code in other projects, other AI development tools, or human developers.

## Project Structure

```
claudepad/
├── conversations/
│   ├── raw/           # Complete conversation transcripts
│   └── summaries/     # Distilled conversation summaries
├── artifacts/         # Output specs, PRDs, and documentation
└── templates/         # Reusable templates for specs and documents
```

## Session Workflow

### During Session
- Engage naturally in design discussions
- Ask clarifying questions to uncover requirements
- Document decisions as they emerge
- Be collaborative and exploratory

### End of Session Protocol

When the user indicates the session is ending (or ~30-45 minutes have passed), follow this protocol:

#### 1. Create Raw Conversation Transcript
**File**: `conversations/raw/YYYY-MM-DD_topic-slug.md`

Store the complete conversation with context header.

#### 2. Generate Conversation Summary
**File**: `conversations/summaries/YYYY-MM-DD_topic-slug_summary.md`

Use `templates/summary_template.md` to create a distilled summary containing:
- Context and key discussion points
- Decisions made with rationale and impact
- Open questions
- Action items
- Links to generated artifacts

#### 3. Create Implementation Artifacts
**File**: `artifacts/[type]_topic-slug.md`

Choose appropriate artifact type:
- `spec_` - Technical specification (use `templates/spec_template.md`)
- `prd_` - Product requirements document
- `design_` - UI/UX specifications
- `architecture_` - System architecture document

Artifacts must be:
- **Implementation-ready**: Detailed enough for developers or AI agents
- **Self-contained**: Include all necessary context
- **Actionable**: Clear requirements and acceptance criteria

#### 4. Workspace Cleanup
- Remove any temporary files created during session
- Keep directory structure clean
- Ensure all documentation is properly organized

## File Naming Conventions

### Raw Conversations
Format: `YYYY-MM-DD_topic-slug.md`
Example: `2025-10-21_user-authentication-redesign.md`

### Summaries
Format: `YYYY-MM-DD_topic-slug_summary.md`
Example: `2025-10-21_user-authentication-redesign_summary.md`

### Artifacts
Format: `[type]_topic-slug.md`
Example: `spec_user-authentication-redesign.md`

### Topic Slug Format
- Lowercase
- Replace spaces with hyphens
- Remove special characters
- Examples: "User Authentication Redesign" → `user-authentication-redesign`

## Quality Checklist

Before ending session:
- [ ] Raw conversation saved with complete context
- [ ] Summary captures all key decisions
- [ ] Artifacts are implementation-ready
- [ ] All files follow naming conventions
- [ ] Workspace is clean (no temp files)
- [ ] Links between documents are working

## Git Workflow

- Conversations (raw/summaries) don't need to be committed unless valuable for long-term reference
- Artifacts should generally be committed as they're meant for implementation use
- If session is interrupted, create checkpoint summary even if incomplete

## Special Considerations

- This is a documentation/planning project with no code compilation or testing
- Focus on clarity, completeness, and actionability in all artifacts
- Multiple artifacts can be created from a single conversation if needed
- Use templates as starting points but adapt to specific conversation needs
