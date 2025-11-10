# Fern Java SDK: Local vs Remote Generation Parity

**Created**: 2025-11-10
**Status**: Implementation Ready
**Scope**: fern-api/fern repository - Java generator and CLI package only

## Overview

Align local Java SDK generation with remote generation to ensure identical output (except for version metadata). Currently, local generation using `fern generate --local` produces different code compared to remote generation through Fern's cloud service.

## Problem Statement

When generating the same SDK locally vs remotely, differences appear in the generated Java code. The goal is to make local generation produce identical output to remote generation, with the only acceptable differences being version-related metadata (SDK version, generator version).

## Analyzing the Differences

To understand what needs to be fixed, clone and compare the generated outputs:

```bash
# Clone the test repository
git clone https://github.com/fern-api/lattice-sdk-java.git
cd lattice-sdk-java

# Compare remote vs local generation
git diff fern-bot/2025-11-10T19-41Z..fern-bot/2025-11-10_19-43-24
```

**Branch Reference**:
- `fern-bot/2025-11-10T19-41Z` - Latest **remote** generation (baseline)
- `fern-bot/2025-11-10_19-43-24` - Latest **local** generation (needs to match remote)

**Analysis Instructions**:
1. Review the diff output to identify all differences between branches
2. Categorize differences into:
   - **Acceptable**: Version metadata (SDK version, generator version)
   - **Must Fix**: Everything else (imports, dependencies, code structure, etc.)
3. Investigate root cause in Fern generator/CLI for each "must fix" category
4. Implement changes to eliminate unwanted differences

## Scope & Boundaries

### In Scope
- **Repository**: `fern-api/fern`
- **Packages**:
  - `packages/cli/fern-api-cli` and its workspace dependencies
  - Java SDK generator
- **Changes**: Code generation logic, templates, and CLI behavior

### Out of Scope
- Other language generators (Python, TypeScript, Go, etc.)
- Remote generation service infrastructure
- Test suite modifications (beyond adding verification tests)

### Acceptable Differences
These metadata differences should remain between local and remote:
- SDK version number (in `build.gradle`, `pom.xml`, or version files)
- Generator version reference
- Any explicitly version-related metadata

### Phase 1: Ignore License File
The `LICENSE` file is currently omitted from generation config. Focus on resolving all other differences first.

### Phase 2: License Resolution
After Phase 1 completion, add LICENSE back to generation config and ensure it generates identically.

## Development Workflow

### Compilation
```bash
cd ~/git/fern
fernic
frond generator java-sdk 99.99.99
```

### Testing
```bash
cd ~/git/workspaces/anduril/config

# If testing with unmodified Fern CLI:
expgh && expft anduril && fern generate --log-level debug --group java-sdk-local --local

# If testing with local Fern CLI changes:
expgh && expft anduril && fernlocal generate --log-level debug --group java-sdk-local --local
```

**Note**: When making changes to the Fern CLI locally, use `fernlocal` instead of `fern` to test with your local build.

### Verification
1. Check the generated SDK at: `https://github.com/fern-api/lattice-sdk-java/`
2. Compare newest branch against baseline: `fern-bot/2025-11-10T19-41Z`
3. Run the diff command:

```bash
# Clone and compare (if not already cloned)
cd /path/to/lattice-sdk-java
git fetch origin
git diff fern-bot/2025-11-10T19-41Z..<NEW_BRANCH>
```

4. Verify only acceptable differences remain (SDK version, generator version)

### Verification via GitHub API
```bash
gh api repos/fern-api/lattice-sdk-java/compare/fern-bot/2025-11-10T19-41Z...<NEW_BRANCH> \
  --jq '.files[] | select(.filename != "LICENSE") | {filename: .filename, changes: .changes}'
```

**Expected Result**: Only version-related changes in build files, README, and metadata files.

## Success Criteria

### Phase 1 (Ignore LICENSE)
- [ ] Local generation produces identical files to remote (except LICENSE, version metadata)
- [ ] All functional differences eliminated (imports, dependencies, code structure, etc.)
- [ ] Generated SDK passes all existing tests
- [ ] Package builds and imports successfully
- [ ] Git diff shows only version-related changes

### Phase 2 (Add LICENSE)
- [ ] LICENSE file added back to generation config
- [ ] LICENSE generates identically between local and remote
- [ ] All Phase 1 success criteria still met

## Investigation Approach

Since the specific differences will be discovered through the git diff analysis, here are key areas to investigate in the Fern generator:

### 1. Template Differences
- Are local and remote using different template versions?
- Is there a "remote mode" flag that needs to be enabled for local?
- Where are Java generator templates located?

### 2. Configuration Loading
- How does local generation vs remote generation load configuration?
- Are there different default behaviors or profiles?
- Is configuration being overridden differently?

### 3. Dependency Management
- How are external dependencies chosen and configured?
- Is there feature detection logic that behaves differently local vs remote?
- Where is dependency injection configured in build files?

### 4. Code Generation Logic
- Import management and package organization
- Exception handling patterns
- Metadata file generation
- README and documentation generation
- Builder pattern generation
- Serialization/deserialization code

### 5. Version Handling
- How should SDK version and generator version be differentiated from other fields?
- Where is version substitution logic implemented?
- Should version fields be parameterized in templates?

## Risk Mitigation

### Testing Strategy
1. **Before changes**: Document current local generation output
2. **During changes**: Test incrementally with each fix
3. **After changes**: Full regression testing with real Anduril Lattice SDK
4. **Verification**: Compare against remote generation baseline

### High-Risk Areas
- Dependency changes in build files (ensure compatibility)
- Serialization logic (JSON/Jackson configuration)
- Exception handling (verify error cases)
- Thread safety and concurrency (if applicable)
- Build tool compatibility (Gradle/Maven)

### Rollback Plan
- Keep feature flags for new behavior if possible
- Document breaking changes
- Maintain backward compatibility where feasible

## Notes for Implementer

1. **Start with diff analysis** - Run the git diff command first to see all actual differences
2. **Categorize systematically** - Group similar changes together (imports, dependencies, etc.)
3. **Root cause first** - Understand WHY differences exist before fixing
4. **Test incrementally** - Fix one category at a time, verify after each
5. **Configuration-driven** - Prefer making generators respect config over hardcoding behavior
6. **Document assumptions** - If certain differences seem intentional, document why
7. **Java-specific considerations** - Pay attention to package naming, import organization, builder patterns

## Related Files (Expected)

In `fern` repository:
- Java generator templates (likely in `generators/java/` or similar)
- CLI generation command implementation
- Configuration loading and processing logic
- Template selection logic for local vs remote
- Code generation engine

## Questions for Clarification

1. Are there known intentional differences beyond version metadata?
2. Should certain features only be available in remote generation?
3. Is there a feature flag system for generator behavior?
4. Should Phase 2 (LICENSE) be implemented differently than other files?

---

**Implementation Priority**: High
**Estimated Complexity**: Medium-High
**Testing Requirements**: Comprehensive (core SDK functionality affected)
