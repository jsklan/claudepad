# ClaudePad

Design workspace and discussion hub for feature planning and project specification development.

## Purpose

This project serves as a conversation space with Claude for:
- Design discussions
- Feature exploration
- Requirements discovery
- Architecture planning
- Creating implementation-ready specifications

## Structure

```
claudepad/
├── conversations/
│   ├── raw/           # Complete conversation transcripts
│   └── summaries/     # Distilled conversation summaries
├── artifacts/         # Output specs, PRDs, and documentation
└── templates/         # Reusable templates
```

## Usage

### Start a Design Discussion

Simply engage Claude in conversation about your idea, feature, or project. The discussion can be freeform and exploratory.

### End of Session

At the end of each session, Claude will:
1. Save the raw conversation transcript
2. Create a distilled summary
3. Generate implementation artifacts (specs, PRDs, etc.)

### Using Artifacts

The output artifacts are designed to be used with:
- Claude Code (in other projects)
- Other AI development tools
- Human developers

## File Naming

- **Raw**: `YYYY-MM-DD_topic-slug.md`
- **Summary**: `YYYY-MM-DD_topic-slug_summary.md`
- **Artifact**: `[type]_topic-slug.md`

## Configuration

See `.claudepad-config.md` for detailed configuration and workflow information
