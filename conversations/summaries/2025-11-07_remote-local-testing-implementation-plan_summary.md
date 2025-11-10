# Remote vs Local Testing Implementation Plan - Summary

**Date**: 2025-11-07
**Type**: Design refinement and implementation planning
**Status**: Complete

## Context

Refined implementation plan for automated testing that verifies Fern's remote generation (Fiddle service) produces identical output to local generation (Docker-based) for SDK generators.

## Key Decisions

### 1. Testing Strategy: Snapshots over Comparison Engine
- **Decision**: Use committed snapshots with `git diff` comparison
- **Rationale**: Simpler, matches existing seed test patterns, deterministic
- **Impact**: Eliminated need for custom FileComparator, Normalizer, ComparisonReport classes

### 2. Fixture Structure: Single Shared over Per-Language
- **Decision**: One IMDB API definition with 8 generator groups (4 generators × 2 modes)
- **Rationale**: Simpler maintenance, matches existing seed test patterns
- **Impact**: Reduced from 4 separate fixtures to 1 shared fixture

### 3. PR #10411 Disposition: Close Without Merging
- **Decision**: Do not merge PR #10411
- **Rationale**: Never tested, has bugs, wrong architectural approach
- **Impact**: Start fresh with snapshot-based implementation

## Final Architecture

### Directory Structure
```
test-definitions-remote-local/
└── fern/
    ├── generators.yml    # 8 groups (ts/java/python/go × remote/local)
    └── apis/imdb/        # Single shared IMDB API

seed-remote-local/
├── ts-sdk/{remote,local}/imdb/
├── java-sdk/{remote,local}/imdb/
├── python-sdk/{remote,local}/imdb/
└── go-sdk/{remote,local}/imdb/
```

### Test Flow
1. Create ephemeral GitHub repo
2. Generate remote (Fiddle) and local (Docker) to separate branches
3. Download both outputs
4. Compare to committed snapshots using `git diff`
5. Report PASS (no diffs) or FAIL (diffs found)
6. Delete ephemeral repo

## Implementation Tickets

### FER-7618 - Create test structure (FIRST)
- Single shared fixture at `test-definitions-remote-local/`
- 8 generator groups in `generators.yml`
- Snapshot directories for 4 generators × 2 modes
- Initial committed snapshots

### FER-7615 - Build test runner CLI
- Command: `pnpm seed test-remote-vs-local --generator ts-sdk --fixture imdb`
- Ephemeral repo management
- Remote/local generation
- Snapshot comparison with `git diff`
- `--update-snapshots` flag

### FER-7617 - GitHub Actions workflow
- Matrix strategy for 4 generators in parallel
- Manual trigger initially
- Runs test runner CLI
- Fails if snapshots changed

### FER-7616 - CANCELED
- Superseded by FER-7618's single shared fixture approach

## Open Questions

None - all key decisions made and tickets updated.

## Action Items

- [x] Update Linear parent issue FER-7605 with new approach
- [x] Create FER-7618 for test structure
- [x] Update FER-7615 for snapshot-based test runner
- [x] Update FER-7617 for simplified GitHub workflow
- [x] Cancel FER-7616 (outdated approach)
- [ ] Implement FER-7618 (next step for Devin)

## Links

- **Raw Conversation**: [2025-11-07_remote-local-testing-implementation-plan.md](../raw/2025-11-07_remote-local-testing-implementation-plan.md)
- **Original Spec**: [artifacts/remote-vs-local-generation-test-spec.md](../../artifacts/remote-vs-local-generation-test-spec.md)
- **PR #10411**: https://github.com/fern-api/fern/pull/10411 (to be closed)
- **Linear Parent**: FER-7605
