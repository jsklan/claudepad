# Remote vs Local Generation Testing Implementation Spec

## Context & Problem Statement

We need a test system that validates that Fern's remote generation (server-side via Fiddle service) produces identical output to local generation (Docker-based local execution) for the same generator configuration and API specification. This ensures consistency between the two execution modes before remote generation is fully deprecated.

## Background: How Remote vs Local Generation Works

### Configuration Differences

**Local Generation (Self-Hosted Mode with `--local` flag):**
```yaml
github:
  uri: owner/repo              # Repository identifier (not full URL)
  token: ${GITHUB_TOKEN}       # GitHub token for pushing
  mode: pull-request           # or push/release
  license:
    custom: ./LICENSE
```

**Remote Generation (Repository Mode without `--local` flag):**
```yaml
github:
  repository: owner/repo       # Repository identifier
  mode: pull-request           # or push/release
  license:
    custom: ./LICENSE
```

**Key Difference**:
- Local uses `uri` + `token` fields → triggers local Docker execution
- Remote uses `repository` field → triggers server-side Fiddle execution
- Detection logic in code: `isGithubSelfhosted()` checks for presence of `uri` and `token` fields

### Execution Flow Comparison

**Local Generation Flow** ([runLocalGenerationForWorkspace.ts:24-100](packages/cli/generation/local-generation/local-workspace-runner/src/runLocalGenerationForWorkspace.ts#L24-L100)):
1. Parse generators.yml and detect self-hosted config via `isGithubSelfhosted()`
2. Generate IR (Intermediate Representation) from API definition
3. Pull Docker image for generator (e.g., `fernapi/fern-typescript-sdk:3.28.0`)
4. Run Docker container locally with IR input
5. Collect generated output files
6. Push to GitHub repository using provided token

**Remote Generation Flow** ([runRemoteGenerationForGenerator.ts:21-150](packages/cli/generation/remote-generation/remote-workspace-runner/src/runRemoteGenerationForGenerator.ts#L21-L150)):
1. Parse generators.yml and detect repository config
2. Generate IR from API definition
3. Register IR with Fiddle service (server-side)
4. Fiddle service pulls Docker image and executes generation
5. Fiddle service pushes output directly to GitHub
6. CLI polls for completion and reports status

**Critical Files**:
- Local generation: `packages/cli/generation/local-generation/local-workspace-runner/src/runLocalGenerationForWorkspace.ts`
- Remote generation: `packages/cli/generation/remote-generation/remote-workspace-runner/src/runRemoteGenerationForGenerator.ts`
- GitHub config detection: Both files use `isGithubSelfhosted()` to determine execution path
- Publishing config: `getPublishConfig()` in local runner handles GitHub push configuration

## Test Requirements

### Core Testing Goals

1. **Output Equivalence**: Generated code from remote and local modes must be byte-for-byte identical (or have only acceptable differences like timestamps)
2. **Latest Published Versions**: Use most recent published Docker images for each generator
3. **Real-World Scenarios**: Test against actual API definitions, not just toy examples
4. **Multi-Generator Coverage**: Test across all major generators (TypeScript, Python, Java, Go, etc.)

### Test Scope

**In Scope**:
- File content comparison (ignoring metadata differences)
- Generated code structure and organization
- Package/project configuration files
- Documentation and README generation

**Out of Scope** (Acceptable Differences):
- Timestamp comments (e.g., `// Generated on 2024-01-15`)
- Build artifacts (e.g., compiled `.pyc` files, `.class` files)
- Git metadata (`.git` directory contents)
- Absolute file paths in comments

**Edge Cases to Consider**:
- Generators with custom configurations
- Multiple API workspaces in single project
- Generators with snippet generation enabled
- Different output modes (npm, PyPI, local-file-system)

## Existing Infrastructure

### Seed Testing Framework

The seed CLI ([packages/seed/src/cli.ts:119-213](packages/seed/src/cli.ts#L119-L213)) provides:
- Docker-based test execution (`DockerTestRunner`)
- Local test execution (`LocalTestRunner`)
- Fixture management (`/test-definitions/` → `/seed/<generator>/<fixture>/`)
- Multi-generator parallel testing

**Current Capabilities**:
```bash
# Test specific fixture with Docker (like local generation)
pnpm seed test --generator typescript-sdk --fixture imdb --skip-scripts

# Run generator on custom project
pnpm seed run --generator go-sdk --path /path/to/project
```

**Gap**: Seed doesn't currently support remote generation execution or comparison

### Setting Up Test Environment from Scratch

Since the implementation agent won't have access to existing workspaces, you'll need to create a test environment. Here's how to set one up:

**1. Initialize a Fern Project**:
```bash
# Create test directory
mkdir /tmp/fern-test-workspace
cd /tmp/fern-test-workspace

# Initialize Fern (creates fern/ directory with sample API)
fern init

# This creates:
# fern/
#   ├── fern.config.json          # Organization config
#   ├── generators.yml             # Generator configuration
#   └── definition/
#       ├── api.yml                # API metadata
#       └── imdb.yml               # Sample API definition (movies API)
```

**2. Default Generated Structure**:

`fern/generators.yml` (default from `fern init`):
```yaml
default-group: local
groups:
  local:
    generators:
      - name: fernapi/fern-typescript-sdk
        output:
          location: local-file-system
          path: ../sdks/typescript
        version: 3.28.4
```

`fern/definition/imdb.yml` (sample API):
```yaml
service:
  base-path: /movies
  endpoints:
    createMovie:
      method: POST
      path: /create-movie
      request: CreateMovieRequest
      response: MovieId
    getMovie:
      method: GET
      path: /{id}
      path-parameters:
        id: MovieId
      response: Movie
# ... types and errors defined
```

**3. Create Test GitHub Repository**:
```bash
# Create a test repository for output comparison
gh repo create fern-test/typescript-sdk-comparison --private --description "Test repository for remote vs local generation comparison"
```

**4. Modify generators.yml for Comparison Testing**:

Replace the default `generators.yml` with dual configuration:

```yaml
# yaml-language-server: $schema=https://schema.buildwithfern.dev/generators-yml.json

default-group: ts-sdk-local

groups:
  # Remote generation (uses Fiddle service)
  ts-sdk-remote:
    generators:
      - name: fernapi/fern-typescript-sdk
        version: 3.28.4
        github:
          repository: fern-test/typescript-sdk-comparison
          mode: pull-request

  # Local generation (uses Docker locally with --local flag)
  ts-sdk-local:
    generators:
      - name: fernapi/fern-typescript-sdk
        version: 3.28.4
        github:
          uri: fern-test/typescript-sdk-comparison
          token: ${GITHUB_TOKEN}
          mode: pull-request
```

**5. Run Both Generation Modes**:
```bash
# Set up environment
export FERN_TOKEN=your_fern_token_here
export GITHUB_TOKEN=your_github_token_here

# Remote generation
fern generate --log-level debug --group ts-sdk-remote

# Local generation
fern generate --log-level debug --group ts-sdk-local --local
```

**6. Compare Outputs**:
```bash
# Clone the test repository
cd /tmp
git clone https://github.com/fern-test/typescript-sdk-comparison
cd typescript-sdk-comparison

# Fetch both branches (PRs create branches)
git fetch origin

# Compare the outputs
git diff origin/fern-pr-remote origin/fern-pr-local
```

**Expected Branch Names**: Fern creates PR branches with predictable patterns like:
- Remote: `fern-pr-<timestamp>-remote` or similar
- Local: `fern-pr-<timestamp>-local` or similar

You can list all branches to find the exact names:
```bash
git branch -r | grep fern
```

**7. Using Existing Test Fixtures (Alternative to IMDB)**:

The Fern repository includes comprehensive test fixtures in `/test-definitions/` that cover more complex scenarios. These can be used for more thorough testing:

```bash
# Available test fixtures include:
# - exhaustive: Comprehensive API features
# - trace: Tracing/telemetry API
# - imdb: Movies database (same as fern init)
# - oauth-client-credentials: OAuth flows
# - file-upload/file-download: File handling
# - server-sent-events: SSE endpoints
# - ... and many more

# To use a test fixture instead of fern init:
cp -r /path/to/fern/test-definitions/fern/apis/exhaustive /tmp/fern-test-workspace/fern/definition/
# Then update generators.yml and run generation
```

These fixtures provide better coverage of edge cases and complex API patterns for comprehensive testing.

## Proposed Test Architecture

### Option 1: Extend Seed CLI (Recommended)

**Rationale**:
- Leverages existing fixture infrastructure
- Natural fit with generator testing workflow
- Can reuse DockerTestRunner and LocalTestRunner logic

**New Command**:
```bash
pnpm seed test-remote-vs-local \
  --generator typescript-sdk \
  --fixture imdb \
  --version 3.28.0 \
  --skip-scripts
```

**Implementation Approach**:

1. **New Test Runner**: `RemoteLocalComparisonTestRunner`
   - Extends existing test runner infrastructure
   - Runs generation twice: once remote, once local
   - Collects outputs to separate directories
   - Performs comparison with configurable filters

2. **Temporary GitHub Repositories**:
   - Create ephemeral test repos (or use dedicated test org)
   - Configure both remote and local to push to different branches
   - Fetch both branches for comparison
   - Clean up after test completion

3. **Comparison Engine**:
   - Normalize outputs (strip timestamps, normalize paths)
   - Perform file-by-file diff
   - Generate comparison report (pass/fail + diff details)
   - Support allowlist for acceptable differences

4. **Integration Points**:
   - Add `test.remoteVsLocal` section to `seed.yml` config
   - Specify GitHub test repository and token
   - Define comparison rules per generator

**seed.yml Extension**:
```yaml
test:
  docker:
    buildCommand: ...
    runCommand: ...
  remoteVsLocal:
    enabled: true
    testRepository: fern-test/typescript-sdk-comparison
    comparisonRules:
      ignore:
        - "**/*.timestamp"
        - "**/generated-on-*.txt"
      normalize:
        - pattern: "Generated by Fern \\d{4}-\\d{2}-\\d{2}"
          replace: "Generated by Fern YYYY-MM-DD"
```

### Option 2: Standalone Comparison Tool

**Rationale**:
- Cleaner separation of concerns
- Can be run independently of seed
- Easier to integrate into CI/CD

**New Package**: `packages/cli/generation/comparison-tool`

**Command**:
```bash
pnpm fern compare-generation \
  --config path/to/generators.yml \
  --remote-group ts-sdk-remote \
  --local-group ts-sdk-local \
  --output /tmp/comparison-report
```

**Implementation Approach**:

1. **Dual Configuration Parser**:
   - Load single `generators.yml` with both remote and local groups
   - Validate groups have identical config except github section

2. **Orchestrator**:
   - Execute remote generation via existing CLI commands
   - Execute local generation via existing CLI commands
   - Clone resulting GitHub branches
   - Perform comparison

3. **Comparison Report**:
   - HTML report with side-by-side diff
   - JSON output for CI integration
   - Statistics (files changed, lines different, etc.)

### Option 3: E2E Test Suite Addition

**Rationale**:
- Natural fit with existing E2E tests
- Can leverage existing test infrastructure
- Part of regular test suite execution

**Location**: `packages/cli/ete-tests/src/tests/generate/remote-vs-local.test.ts`

**Implementation Approach**:

1. **Test Fixtures**:
   - Add test generators.yml with paired groups
   - Use test GitHub organization/repos
   - Store in `packages/cli/ete-tests/src/fixtures/`

2. **Test Cases**:
   - One test per generator (TypeScript, Python, Java, Go, etc.)
   - Test with multiple fixtures (simple, complex, with-custom-config)
   - Verify outputs match expected patterns

3. **Execution**:
   - Part of `pnpm test:ete` suite
   - Can be run selectively with test filtering
   - Requires FERN_TOKEN and GITHUB_TOKEN env vars

## Implementation Roadmap

### Phase 1: Proof of Concept (2-3 days)

**Goal**: Validate approach with single generator

1. **Setup Test Environment**:
   - Follow "Setting Up Test Environment from Scratch" section above
   - Use `fern init` to create sample project with IMDB API
   - Create test GitHub repository (e.g., `fern-test/typescript-sdk-comparison`)
   - Configure generators.yml with remote + local groups (see example in setup section)
   - Ensure FERN_TOKEN and GITHUB_TOKEN available

2. **Manual Testing**:
   ```bash
   cd /tmp/fern-test-workspace

   # Generate remote (uses Fiddle service)
   fern generate --log-level debug --group ts-sdk-remote

   # Generate local (uses Docker locally)
   fern generate --log-level debug --group ts-sdk-local --local

   # Clone and compare
   cd /tmp
   git clone https://github.com/fern-test/typescript-sdk-comparison
   cd typescript-sdk-comparison
   git fetch origin

   # Find and compare the PR branches
   git branch -r | grep fern
   git diff origin/fern-pr-<timestamp>-remote origin/fern-pr-<timestamp>-local
   ```

3. **Document Differences**:
   - Identify acceptable vs unacceptable differences
   - Create normalization rules (timestamps, build metadata, etc.)
   - Define pass/fail criteria
   - Note: Initial API from `fern init` is simple IMDB movies API - good starting point

### Phase 2: Automated Comparison (3-5 days)

**Goal**: Build automated comparison tool

1. **Comparison Logic**:
   - File content normalization
   - Directory structure comparison
   - Diff generation with context
   - Pass/fail determination

2. **Integration Point**:
   - Choose from Option 1, 2, or 3 above
   - Implement based on team preference
   - Add configuration support

3. **Testing**:
   - Test with TypeScript SDK (most mature)
   - Test with Python SDK (complex configs)
   - Validate comparison logic catches real differences

### Phase 3: Multi-Generator Support (1 week)

**Goal**: Extend to all generators

1. **Generator-Specific Rules**:
   - Each generator may have unique acceptable differences
   - Language-specific normalization (e.g., Python `__pycache__`)
   - Document per-generator quirks

2. **Parallel Execution**:
   - Run multiple generator comparisons concurrently
   - Aggregate results into unified report
   - Handle failures gracefully

3. **CI Integration**:
   - Add to GitHub Actions workflow
   - Run on generator changes
   - Report results in PR comments

### Phase 4: Production Readiness (3-5 days)

**Goal**: Make it reliable and maintainable

1. **Error Handling**:
   - Graceful handling of generation failures
   - Retry logic for flaky operations (GitHub API, Docker pulls)
   - Clear error messages with actionable guidance

2. **Performance Optimization**:
   - Parallel test execution
   - Caching of Docker images
   - Efficient diff algorithms

3. **Documentation**:
   - Update CLAUDE.md with testing instructions
   - Create troubleshooting guide
   - Document acceptable differences

## Technical Implementation Details

### Key Code Locations to Modify

**For Option 1 (Seed Extension)**:

1. **New Test Runner** (`packages/seed/src/commands/test/test-runner/RemoteLocalComparisonTestRunner.ts`):
   ```typescript
   export class RemoteLocalComparisonTestRunner {
     async run({
       fixture,
       generator,
       remoteConfig,
       localConfig
     }: RunOptions): Promise<ComparisonResult> {
       // 1. Run remote generation
       const remoteOutput = await this.runRemote(fixture, remoteConfig);

       // 2. Run local generation
       const localOutput = await this.runLocal(fixture, localConfig);

       // 3. Compare outputs
       return await this.compare(remoteOutput, localOutput, generator.comparisonRules);
     }
   }
   ```

2. **Comparison Engine** (`packages/seed/src/comparison/`):
   - `FileComparator.ts`: File-by-file comparison logic
   - `Normalizer.ts`: Content normalization (strip timestamps, etc.)
   - `ComparisonReport.ts`: Generate human-readable reports

3. **CLI Integration** (`packages/seed/src/cli.ts`):
   ```typescript
   function addRemoteVsLocalTestCommand(cli: Argv) {
     cli.command(
       'test-remote-vs-local',
       'Compare remote vs local generation outputs',
       (yargs) => yargs
         .option('generator', { ... })
         .option('fixture', { ... })
         .option('version', { ... }),
       async (argv) => {
         // Orchestrate comparison test
       }
     );
   }
   ```

**For Option 2 (Standalone Tool)**:

1. **New Package** (`packages/cli/generation/comparison-tool/`):
   - `src/ComparisonOrchestrator.ts`: Main orchestration logic
   - `src/GenerationRunner.ts`: Execute both remote and local
   - `src/OutputComparator.ts`: Comparison logic
   - `src/ReportGenerator.ts`: Generate comparison reports

2. **CLI Entry Point** (`packages/cli/cli/src/cli.ts`):
   ```typescript
   .command(
     'compare-generation',
     'Compare remote vs local generation',
     addCompareGenerationCommand
   )
   ```

**For Option 3 (E2E Test)**:

1. **Test File** (`packages/cli/ete-tests/src/tests/generate/remote-vs-local.test.ts`):
   ```typescript
   describe('Remote vs Local Generation', () => {
     it('should produce identical output for TypeScript SDK', async () => {
       // Setup test repo
       // Run remote generation
       // Run local generation
       // Compare outputs
       expect(differences).toHaveLength(0);
     });
   });
   ```

2. **Test Utilities** (`packages/cli/ete-tests/src/utils/comparison.ts`):
   - Shared comparison logic
   - GitHub interaction helpers
   - File normalization utilities

### Comparison Algorithm Pseudocode

```typescript
async function compareGenerationOutputs(
  remoteOutput: OutputDirectory,
  localOutput: OutputDirectory,
  rules: ComparisonRules
): Promise<ComparisonResult> {
  const differences: Difference[] = [];

  // 1. Compare directory structures
  const remoteFiles = listFiles(remoteOutput);
  const localFiles = listFiles(localOutput);

  const onlyInRemote = difference(remoteFiles, localFiles);
  const onlyInLocal = difference(localFiles, remoteFiles);
  const inBoth = intersection(remoteFiles, localFiles);

  if (onlyInRemote.length > 0) {
    differences.push({ type: 'missing-in-local', files: onlyInRemote });
  }
  if (onlyInLocal.length > 0) {
    differences.push({ type: 'missing-in-remote', files: onlyInLocal });
  }

  // 2. Compare file contents
  for (const file of inBoth) {
    if (shouldIgnore(file, rules.ignore)) {
      continue;
    }

    const remoteContent = await readFile(join(remoteOutput, file));
    const localContent = await readFile(join(localOutput, file));

    // Normalize content based on rules
    const normalizedRemote = normalize(remoteContent, rules.normalize);
    const normalizedLocal = normalize(localContent, rules.normalize);

    if (normalizedRemote !== normalizedLocal) {
      const diff = generateDiff(normalizedRemote, normalizedLocal);
      differences.push({
        type: 'content-mismatch',
        file,
        diff
      });
    }
  }

  // 3. Generate result
  return {
    passed: differences.length === 0,
    differences,
    summary: generateSummary(differences),
    report: generateHtmlReport(differences)
  };
}
```

### GitHub Integration Strategy

**Approach 1: Ephemeral Test Repositories**
- Create temporary repos for each test run
- Delete after comparison completes
- Pros: Clean slate, no pollution
- Cons: GitHub API rate limits, slower

**Approach 2: Dedicated Test Repositories with Branches**
- Maintain permanent test repos (e.g., `fern-test/typescript-sdk-comparison`)
- Use unique branch names per test run (e.g., `test-run-${timestamp}-remote`)
- Clean up old branches periodically
- Pros: Faster, reusable, history for debugging
- Cons: Repo pollution, requires cleanup

**Approach 3: Fork Actual SDK Repositories**
- Use existing SDK repos (e.g., `fern-api/lattice-sdk-javascript`)
- Push to test branches
- Leverage real-world repositories
- Pros: Most realistic testing
- Cons: Potential pollution of production repos

**Recommended**: Approach 2 (Dedicated Test Repositories)

### Environment Setup

**Required Environment Variables**:
```bash
# Fern authentication for remote generation
export FERN_TOKEN=your_fern_token_here

# GitHub token for repository access
export GITHUB_TOKEN=your_github_token_here

# Optional: Override test repository
export FERN_TEST_REPO_ORG=fern-test
```

**Test Repository Setup**:
```bash
# Create test repositories (one-time setup)
gh repo create fern-test/typescript-sdk-comparison --private
gh repo create fern-test/python-sdk-comparison --private
gh repo create fern-test/java-sdk-comparison --private
# ... etc for each generator
```

## Success Criteria

### Definition of Done

1. **Automated Testing**:
   - Single command runs full comparison for a generator
   - Tests run in CI on generator changes
   - Results available in PR comments

2. **Coverage**:
   - All major generators tested (TypeScript, Python, Java, Go, C#, Ruby)
   - At least 3 fixtures per generator (simple, complex, custom-config)
   - Edge cases covered (multiple APIs, snippet generation, etc.)

3. **Reliability**:
   - <5% false positive rate (claiming differences when none exist)
   - 0% false negative rate (missing actual differences)
   - Handles generation failures gracefully

4. **Maintainability**:
   - Comparison rules configurable per generator
   - Clear documentation for adding new generators
   - Easy to update when acceptable differences change

### Validation Approach

**Before Considering Complete**:

1. **Baseline Validation**:
   - Run against all generators with latest published versions
   - Verify no unexpected differences
   - Document all acceptable differences found

2. **Deliberate Difference Testing**:
   - Introduce known differences (e.g., change generator config)
   - Verify comparison detects them
   - Confirm diff output is clear and actionable

3. **Real-World Testing**:
   - Test with production-like API definitions (not just IMDB sample)
   - Use generators from `/test-definitions/` directory (established test fixtures)
   - Compare against known-good production outputs
   - Validate with Fern team's existing validation process

## Open Questions & Decisions Needed

### Questions for User/Team

1. **Preferred Architecture**: Which option (Seed extension, Standalone tool, E2E test)?
   - **Recommendation**: Option 1 (Seed extension) for consistency with existing workflow

2. **Test Repository Strategy**: Ephemeral, dedicated, or fork actual repos?
   - **Recommendation**: Dedicated test repos with branch-based testing

3. **Acceptable Differences**: What differences should be ignored by default?
   - Timestamps/generation dates
   - Absolute file paths in comments
   - Build artifacts (language-specific)
   - Git metadata
   - **Need**: Team input on generator-specific acceptable differences

4. **CI Integration Scope**: When should these tests run?
   - On every generator PR?
   - Nightly only?
   - On-demand manually?
   - **Recommendation**: On generator PRs + nightly for comprehensive coverage

5. **Generator Version Constraints**:
   - Always test latest published?
   - Support testing specific version ranges?
   - Test against unpublished local changes?
   - **Recommendation**: Latest published by default, with override for specific versions

6. **Failure Handling**:
   - Block generator releases if comparison fails?
   - Warn only?
   - Allow overrides with justification?
   - **Recommendation**: Block releases, require investigation

### Technical Decisions

1. **Normalization Library**:
   - Build custom normalizer?
   - Use existing diff library (e.g., `diff`, `jsdiff`)?
   - **Recommendation**: Use `diff` library + custom normalization layer

2. **Output Storage**:
   - Store full outputs for debugging?
   - Just store diffs?
   - How long to retain?
   - **Recommendation**: Store diffs + summary, full outputs on failure only, retain for 7 days

3. **Parallelization**:
   - Run all generator comparisons in parallel?
   - Sequential with progress reporting?
   - **Recommendation**: Parallel with configurable concurrency (default: 3)

## References

### Code References
- [runLocalGenerationForWorkspace.ts:24-250](packages/cli/generation/local-generation/local-workspace-runner/src/runLocalGenerationForWorkspace.ts#L24-L250)
- [runRemoteGenerationForGenerator.ts:21-150](packages/cli/generation/remote-generation/remote-workspace-runner/src/runRemoteGenerationForGenerator.ts#L21-L150)
- [seed/cli.ts:119-213](packages/seed/src/cli.ts#L119-L213)
- [GithubSelfhostedSchema.ts](packages/cli/configuration/src/generators-yml/schemas/api/resources/group/types/GithubSelfhostedSchema.ts)
- [GithubPushSchema.ts](packages/cli/configuration/src/generators-yml/schemas/api/resources/group/types/GithubPushSchema.ts)

### Configuration References
- Example generators.yml configurations provided in "Setting Up Test Environment from Scratch" section above

### Documentation
- [CLAUDE.md Production SDK Generation Flow](CLAUDE.md#production-sdk-generation-flow)
- [CLAUDE.md Seed Testing](CLAUDE.md#seed-testing-development)

## Next Steps for Implementation Agent

To implement this test system, the agent should:

1. **Read this specification thoroughly**
2. **Set up test environment from scratch**:
   - Follow "Setting Up Test Environment from Scratch" section
   - Run `fern init` to create sample IMDB API project
   - Create GitHub test repository
   - Configure dual generators.yml (remote + local groups)
3. **Choose architecture approach** (recommend Option 1 unless user specifies otherwise)
4. **Start with Phase 1 (PoC)**:
   - Use TypeScript SDK as first generator (comes default with `fern init`)
   - Use IMDB API from `fern init` (simple movies API)
   - Run both remote and local generation
   - Document all differences found
5. **Implement comparison logic** incrementally:
   - Start with simple file existence checks
   - Add content comparison with no normalization
   - Add normalization rules based on Phase 1 findings
6. **Extend to other generators** one at a time
7. **Integrate into CI** after validation
8. **Document learnings** and update this spec

**First Concrete Task**:
1. Run `fern init` in a test directory
2. Create GitHub test repository with `gh repo create`
3. Modify generators.yml to have both remote and local groups (use example configuration from this spec)
4. Execute both generation modes manually
5. Compare outputs with `git diff` to identify baseline differences
