# Remote vs Local Testing Implementation Plan - Complete Conversation

**Date**: 2025-11-07
**Topic**: Refining implementation plan for remote vs local SDK generation testing in Fern repo
**Session Type**: Design refinement and Linear ticket updates

## Context

This session continued from a previous conversation that ran out of context. The goal was to analyze an existing spec and PR #10411, then create a better implementation plan for automated testing that verifies Fern's remote generation (Fiddle service) produces identical output to local generation (Docker-based).

## Initial Request

User asked me to:
1. Analyze the spec: `artifacts/remote-vs-local-generation-test-spec.md`
2. Analyze PR #10411 which implemented a `test-remote-vs-local` CLI command
3. Figure out a better implementation plan
4. Create Linear sub-issues for Devin to implement sequentially

## Key Requirements Gathered

- **Scope**: TypeScript, Java, Python, Go generators initially
- **Trigger**: Manual GitHub Actions workflow (can add scheduling later)
- **Test Strategy**: Snapshot-based testing (like existing seed tests), not custom comparison engine
- **Repository Strategy**: Ephemeral GitHub repos created per test run, deleted after
- **CLI Usage**: Build CLI locally from source (not published CLI)
- **Comparison Method**: Use `git diff` against committed snapshots
- **Fixture Structure**: Single shared IMDB API definition with multiple generator groups

## Major Direction Changes

### Change 1: From Comparison Engine to Snapshots
**Initial Approach** (PR #10411):
- Custom FileComparator, Normalizer, ComparisonReport classes
- Complex comparison logic with normalization rules
- Ephemeral repos for both comparison and generation

**Final Approach**:
- Committed snapshots in `seed-remote-local/` directory
- Simple `git diff` for comparison
- Snapshots are source of truth
- Matches existing seed test patterns

### Change 2: From Per-Language Fixtures to Single Shared Fixture
**Initial Approach**:
- Separate test fixtures per language: `typescript/fern/`, `java/fern/`, etc.
- Each with its own API definition and generators.yml

**Final Approach**:
- Single shared fixture: `test-definitions-remote-local/fern/apis/imdb/`
- One `generators.yml` with 8 groups (4 generators × 2 modes each)
- Single IMDB API definition used by all generators

### Change 3: From Manual Testing to Automated Snapshots
**Initial Approach**:
- Manual test context creation each time
- Comparison reports generated on each run

**Final Approach**:
- Committed snapshots in repo
- Test runner compares fresh output to snapshots
- `--update-snapshots` flag for intentional changes
- Git tracks all snapshot changes

## PR #10411 Assessment

**Problems Identified**:
1. Never tested with actual tokens
2. Branch extraction regex never validated
3. File counting bug (double-counts files)
4. Shell injection vulnerability risk
5. Missing error handling
6. Wrong architectural approach (comparison engine vs snapshots)

**Recommendation**: Do NOT merge PR #10411

**User Decision**: Agreed to close PR #10411

## Final Architecture

### Directory Structure
```
test-definitions-remote-local/
└── fern/
    ├── fern.config.json
    ├── generators.yml    # 8 groups: ts/java/python/go × remote/local
    └── apis/
        └── imdb/
            ├── api.yml
            └── definition.yml

seed-remote-local/
├── ts-sdk/
│   ├── seed.yml
│   ├── remote/imdb/      # Snapshot from Fiddle service
│   └── local/imdb/       # Snapshot from Docker local
├── java-sdk/
│   ├── seed.yml
│   ├── remote/imdb/
│   └── local/imdb/
├── python-sdk/
│   ├── seed.yml
│   ├── remote/imdb/
│   └── local/imdb/
└── go-sdk/
    ├── seed.yml
    ├── remote/imdb/
    └── local/imdb/
```

### Generator Configuration Pattern
```yaml
# test-definitions-remote-local/fern/generators.yml
groups:
  ts-sdk-remote:
    generators:
      - name: fernapi/fern-typescript-sdk
        version: <version>
        github:
          repository: <ephemeral-repo>  # Uses Fiddle
          mode: pull-request

  ts-sdk-local:
    generators:
      - name: fernapi/fern-typescript-sdk
        version: <version>
        github:
          uri: <ephemeral-repo>         # Uses local Docker
          token: <token>
          mode: pull-request

  # ... similar for java-sdk, python-sdk, go-sdk
```

### Test Flow
```
1. Create ephemeral GitHub repo
2. Generate remote (Fiddle service) → branch A
3. Generate local (Docker) → branch B
4. Download branch A output
5. Download branch B output
6. Compare A to seed-remote-local/{generator}/remote/imdb/
7. Compare B to seed-remote-local/{generator}/local/imdb/
8. If --update-snapshots: Copy A and B to snapshot directories
9. Delete ephemeral repo
10. Report: PASS if no diffs, FAIL if diffs found
```

## Linear Tickets Created/Updated

### FER-7605 (Parent Issue)
**Status**: Updated
**Title**: [Remote vs Local Testing] Implement automated testing for remote vs local generation parity

**Summary**: Automated snapshot-based testing system to verify remote (Fiddle) and local (Docker) generation produce identical outputs.

### FER-7618 (New Sub-Issue)
**Status**: Created
**Title**: [Remote vs Local Testing] Create test-definitions and seed snapshot structure

**Scope**:
- Create single shared fixture at `test-definitions-remote-local/fern/apis/imdb/`
- Create `generators.yml` with 8 groups (4 generators × 2 modes)
- Create `seed-remote-local/` directory structure
- Create initial snapshots for all 4 generators
- Create `seed.yml` files with local build/run commands

**Dependencies**: None (first ticket to implement)

### FER-7615 (Updated Sub-Issue)
**Status**: Updated
**Title**: [Remote vs Local Testing] Build test runner that compares snapshots

**Scope**:
- Create `pnpm seed test-remote-vs-local` CLI command
- Ephemeral GitHub repo management (create/delete)
- Remote generation via Fiddle
- Local generation via Docker
- Snapshot comparison using `git diff`
- `--update-snapshots` flag implementation
- Branch name extraction from CLI output

**Dependencies**: FER-7618 (needs snapshot structure to exist)

**Key Implementation Points**:
- Use locally built CLI: `packages/cli/dist/dev/cli.cjs`
- Reference existing seed test patterns
- Reuse `GeneratorWorkspace`, `TaskContext`, `LocalTestRunner` utilities
- Fix branch extraction regex issues from PR #10411

### FER-7617 (Updated Sub-Issue)
**Status**: Updated
**Title**: [Remote vs Local Testing] Build GitHub Actions workflow with matrix strategy

**Scope**:
- GitHub Actions workflow file
- Matrix strategy for 4 generators in parallel
- Manual workflow trigger initially
- FERN_TOKEN secret configuration
- Git diff-based failure detection
- Clear error messages with diffs

**Dependencies**: FER-7618 (snapshot structure), FER-7615 (test runner CLI)

**Key Points**:
- Workflow just runs `pnpm seed test-remote-vs-local` command
- Uses `git diff --exit-code` to detect snapshot changes
- Fails if snapshots changed (indicates output diverged)
- Minimal workflow - complexity is in CLI command

### FER-7616 (Canceled)
**Status**: Canceled
**Reason**: Superseded by FER-7618's single shared fixture approach

Original ticket described creating separate per-language fixtures, which is no longer the approach.

## Implementation Sequence

```
FER-7618 (Create structure)
    ↓
FER-7615 (Build test runner)
    ↓
FER-7617 (GitHub Actions workflow)
```

## Key Learnings from Fern Repo Analysis

### Files Analyzed

1. **`/seed/ts-sdk/seed.yml`**
   - Shows local test configuration pattern
   - `buildCommand`: How to build generator from source
   - `runCommand`: How to run locally built generator
   - `fixtures`: Configuration per test fixture

2. **`/packages/cli/ete-tests/src/utils/runFernCli.ts`**
   - Shows how ETE tests build CLI from source
   - Uses `cli/dist/dev/cli.cjs` (not published CLI)
   - Environment variable handling for tokens

3. **`/packages/seed/src/commands/test/testWorkspaceFixtures.ts`**
   - Shows fixture loading pattern
   - Single fixture definitions in `test-definitions/fern/apis/`
   - Multiple generators can use same fixture

### Patterns to Follow

1. **Single Shared Fixture**: One IMDB API definition, multiple generator groups
2. **Local Build from Source**: Build CLI before tests, use built artifacts
3. **Committed Snapshots**: Store expected output in repo, use git diff
4. **Seed Configuration**: Each generator has `seed.yml` with build/run commands
5. **Generator Groups**: YAML configuration defining how to run each test variant

## Deferred Features

- Scheduled cron execution (add after manual validation)
- Automatic GitHub issue creation on failure
- Slack notifications
- Additional generators beyond TypeScript, Java, Python, Go
- Custom generator configurations
- Advanced comparison rules/normalization

## User Feedback Incorporated

### Feedback 1: Use Snapshots, Not Custom Comparison
> "I think that instead of manually creating the test context each time, we should have a test fixture and snapshot output that are saved to the repo similar to how we do for existing seed tests"

**Action**: Shifted to snapshot-based testing approach

### Feedback 2: Single Shared Fixture
> "you don't need a different test fixture for each language. you just need to have a single one with multiple generator groups, the same way that we only have a single test fixture for each seed test"

**Action**: Updated FER-7618 to use single `test-definitions-remote-local/fern/apis/imdb/` fixture

### Feedback 3: Keep Seed CLI Command Approach
> "I don't think the original approach of adding a seed cli command was necessarily a bad idea, it was just an incomplete change. we may want to keep that as well if it works well with the rest of our plan."

**Action**: Kept `pnpm seed test-remote-vs-local` command approach in FER-7615

### Feedback 4: Don't Merge PR #10411
> "should I merge the other PR as is?"

**Recommendation**: No - has bugs and wrong approach
**User Decision**: "no, i'm fine to close it out"

## Reference Links

- **Original Spec**: `/Users/jsklan/git/claudepad/artifacts/remote-vs-local-generation-test-spec.md`
- **PR #10411**: https://github.com/fern-api/fern/pull/10411 (to be closed)
- **Linear Parent**: FER-7605
- **Fern Repo**: `/Users/jsklan/git/fern`

## Session Artifacts

All Linear tickets have been updated with the final snapshot-based approach:
- FER-7605: Parent issue overview
- FER-7618: Test structure creation (FIRST TO IMPLEMENT)
- FER-7615: Test runner CLI
- FER-7617: GitHub Actions workflow
- FER-7616: Canceled (outdated approach)

## Next Steps for Implementation

1. **Implement FER-7618**: Create directory structure, fixture, initial snapshots
2. **Implement FER-7615**: Build test runner CLI command
3. **Implement FER-7617**: Create GitHub Actions workflow
4. **Test manually**: Validate entire flow with real tokens
5. **Run in CI**: Trigger workflow, verify it works
6. **Add enhancements**: Scheduling, notifications, additional generators
