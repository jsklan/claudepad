# Batch Triage Automation - Conversation Summary
**Date**: 2025-10-22
**Status**: ✅ Complete - Ready for Implementation

---

## Context

Continued session to design comprehensive batch triage automation tool for Fern's enterprise SDK clients (Square, Intercom, Cohere, ElevenLabs). Goal: Reduce manual triage time by 50% through intelligent automation.

---

## Key Discussion Points

### 1. Strategic Approach Refinement
**Initial**: Reproduction-heavy workflow
**Refined**: Textual analysis first with selective reproduction
- Avoid unnecessary reproductions through smart categorization
- Only reproduce when textual analysis is inconclusive or verification needed
- 4 categories: (a) Service bugs, (b) User errors, (c) Config bugs, (d) Generator/CLI bugs

### 2. Output Structure Evolution
**Initial Design**: Separate `./reports/` directory for triage reports
**Final Design**: Unified structure in `~/git/jsklan-repros`
- Every GitHub issue gets a folder: `{client}/{gh-issue#}-{short-description}/`
- `report.md` always created (triage analysis with Linear, GitHub, Slack links)
- Reproduction artifacts added only if reproduction performed
- Single source of truth for all issue work

### 3. Integration Requirements
- Tool must clone jsklan-repros, create branches, push changes, create PRs
- Parallel reproduction execution (3 concurrent max)
- Branch naming: `repro/FER-{linearId}-{client}-{language}`
- Tight coupling acceptable for immediate usability (frond, marvin, jsklan-repros)

### 4. Metadata Extraction
Added comprehensive extraction including:
- Client and language from title format: `[Client, language, ghIssue]`
- GitHub URL from description
- **Slack thread URL** from description (requested during session)
- SDK version detection (explicit mention or timestamp-based)

---

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|---------|
| Textual analysis first | Avoid unnecessary reproductions | Faster triage, lower compute cost |
| Unified output in jsklan-repros | Single source of truth, easier navigation | Simplified workflow, git history tracking |
| {gh-issue#}-{slug} naming | Easy reference by GitHub issue | Quick issue lookup |
| Always create report.md | Document all triage decisions | Complete audit trail |
| Parallel reproductions (3 max) | Accelerate batch processing | ~60% time reduction for repro phase |
| Slack URL extraction | Complete issue context | Easy access to discussion threads |

---

## Technical Specifications

### Architecture
- **Language**: TypeScript
- **Primary Tools**: Linear MCP, Sequential MCP, Serena MCP
- **Integration**: Frond (SDK generation), Marvin (test projects), gh CLI (PRs)
- **Execution**: Batch processing with parallel reproduction

### Core Components
1. **MetadataExtractor**: Parse Linear issues for structured data (including Slack URLs)
2. **TextualAnalyzer**: Categorize issues with confidence scoring
3. **ReproductionOrchestrator**: Manage reproduction lifecycle
4. **ReproRepository**: Git workflow automation (clone → branch → commit → push → PR)
5. **BatchReproductionManager**: Parallel processing coordination

### Output Structure
```
jsklan-repros/
├── square/
│   ├── 496-pagination-search-articles/
│   │   ├── report.md              # Always present
│   │   ├── reproduction.ts        # If repro performed
│   │   ├── package.json
│   │   └── results.json
├── intercom/
│   └── 493-offline-tokenization/
│       ├── report.md
│       ├── reproduction.py
│       ├── requirements.txt
│       └── results.json
└── summary-2025-10-22.md          # Batch summary
```

---

## Open Questions

None - All requirements clarified during session.

---

## Action Items

### For User
- [ ] Review specification: `/Users/jsklan/git/claudepad/artifacts/spec_batch-triage-automation.md`
- [ ] Validate approach meets needs before implementation
- [ ] Set up new project for implementation

### For Implementation (by Claude Code or Developer)
- [ ] Week 1: Phase 1 - Textual Analysis MVP
  - Core infrastructure (TypeScript, Linear MCP)
  - MetadataExtractor with Slack URL extraction
  - TextualAnalyzer with categorization logic
  - ReportGenerator with unified output
- [ ] Week 2: Phase 2 - Reproduction Automation
  - ReproductionOrchestrator
  - ReproRepository with git workflow
  - BatchReproductionManager with parallel processing
- [ ] Week 3: Polish & Production
  - Edge case handling
  - Documentation
  - Performance optimization
  - Production deployment

---

## Links to Artifacts

### Primary Deliverable
- **Specification**: [`spec_batch-triage-automation.md`](../../artifacts/spec_batch-triage-automation.md)
  - Complete Phase 1 + Phase 2 design
  - TypeScript implementation examples
  - Configuration files
  - 3-week implementation roadmap

### Conversation Records
- **Raw Transcript**: [`2025-10-22_batch-triage-automation.md`](../raw/2025-10-22_batch-triage-automation.md)

---

## Success Criteria

✅ **Functional**: Batch process all open issues, categorize with ≥70% accuracy, execute parallel reproductions, create PRs
✅ **Performance**: Process 20+ issues/hour (analysis), complete 3 reproductions in ~2 minutes
✅ **Usability**: Out-of-the-box ready, reduces manual triage time by 50%
✅ **Output**: Unified structure in jsklan-repros with complete audit trail

---

## Session Outcome

**Status**: ✅ **Ready for Implementation**

The specification is comprehensive, implementation-ready, and can be handed directly to Claude Code in a new project to build the complete tool. All design decisions have been validated with the user, including the critical unified output structure and Slack URL extraction requirement.
