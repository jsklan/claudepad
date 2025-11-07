# Fern C# SDK Generator: XML Entity Bug Reproduction Guide

## Bug Summary

The Fern C# SDK Generator (v2.6.0) generates invalid C# XML documentation comments when OpenAPI specifications contain HTML entities like `&plus;`, `&minus;`, `&times;`, etc. These entities are not valid in XML (which C# uses for documentation comments), causing compilation failures when documentation warnings are treated as errors.

## Root Cause

**Problem Chain:**
1. OpenAPI spec contains HTML entities (e.g., `&plus;` for the "+" symbol)
2. Fern C# generator copies descriptions directly into XML doc comments without HTML-decoding
3. Generated C# code contains: `/// <summary>...&plus;...</summary>`
4. C# XML parser only recognizes 5 built-in XML entities: `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&apos;`
5. Unknown entity `&plus;` causes XML validation errors
6. Build fails with: `error CS1570: XML comment has badly formed XML -- 'Reference to undeclared entity 'plus'.'`

## Real-World Example

**From Square .NET SDK:**

OpenAPI spec contains:
```json
{
  "start_at": {
    "description": "The start time of the shift, in RFC 3339 format in the time zone &plus;\noffset of the shift location..."
  }
}
```

Fern generates:
```csharp
/// <summary>
/// The start time of the shift, in RFC 3339 format in the time zone &plus;
/// offset of the shift location...
/// </summary>
public string? StartAt { get; set; }
```

Compilation error:
```
error CS1570: XML comment has badly formed XML -- 'Reference to undeclared entity 'plus'.'
```

## Minimal Reproduction Steps

### Prerequisites
- Fern CLI installed (`npm install -g fern-api`)
- .NET SDK 6.0 or later
- A temporary working directory

### Step 1: Create Project Structure

```bash
mkdir fern-xml-entity-bug
cd fern-xml-entity-bug
```

### Step 2: Create OpenAPI Specification

Create file: `openapi.json`

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "XML Entity Bug Test API",
    "version": "1.0.0",
    "description": "Minimal API to reproduce XML entity bug in Fern C# generator"
  },
  "paths": {},
  "components": {
    "schemas": {
      "TimeZoneModel": {
        "type": "object",
        "description": "Model demonstrating HTML entity bug",
        "properties": {
          "timeZoneOffset": {
            "type": "string",
            "description": "Format is UTC &plus; offset notation (e.g., &plus;05:30)"
          },
          "mathExpression": {
            "type": "string",
            "description": "Expression: A &plus; B &minus; C &times; D &divide; E"
          },
          "validEntity": {
            "type": "string",
            "description": "This uses valid XML entity: A &lt; B &amp; C &gt; D"
          }
        },
        "required": ["timeZoneOffset"]
      }
    }
  }
}
```

### Step 3: Initialize Fern

```bash
fern init
```

This creates a `fern/` directory with configuration files.

### Step 4: Configure OpenAPI Import

Update or create `fern/fern.config.json`:

```json
{
  "organization": "test-org",
  "version": "0.0.0"
}
```

Create `fern/api/definition/api.yml`:

```yaml
name: xml-entity-bug-test
```

### Step 5: Configure C# SDK Generator

Create `fern/generators.yml`:

```yaml
api:
  specs:
    - openapi: ../../openapi.json

groups:
  csharp-sdk:
    generators:
      - name: fernapi/fern-csharp-sdk
        version: 2.6.0
        output:
          location: local-file-system
          path: ./generated-sdk
        config:
          namespace: XmlEntityBugTest
          explicit-namespaces: true
```

### Step 6: Generate the SDK

```bash
fern generate --group csharp-sdk
```

Expected output: SDK generated in `./generated-sdk/`

### Step 7: Verify Generated Code Contains Bug

Check the generated model file:

```bash
cat generated-sdk/src/XmlEntityBugTest/TimeZoneModel.cs
```

**Expected to see:**
```csharp
/// <summary>
/// Format is UTC &plus; offset notation (e.g., &plus;05:30)
/// </summary>
public string TimeZoneOffset { get; set; }
```

**Note:** The `&plus;` entity appears literally instead of being decoded to `+`.

### Step 8: Attempt Compilation (This Will Fail)

```bash
cd generated-sdk
dotnet build
```

**Expected Errors:**
```
error CS1570: XML comment has badly formed XML -- 'Reference to undeclared entity 'plus'.'
error CS1570: XML comment has badly formed XML -- 'Reference to undeclared entity 'minus'.'
error CS1570: XML comment has badly formed XML -- 'Reference to undeclared entity 'times'.'
error CS1570: XML comment has badly formed XML -- 'Reference to undeclared entity 'divide'.'
```

**Note:** The `validEntity` property should NOT have errors because `&lt;`, `&gt;`, and `&amp;` are valid XML entities.

### Step 9: Verify XML Documentation Tool Failures

If compilation succeeds (warnings not treated as errors), try generating XML documentation:

```bash
dotnet build /p:GenerateDocumentationFile=true /p:TreatWarningsAsErrors=true
```

This will definitely fail with XML entity errors.

## Bug Characteristics

### HTML Entities That Cause Failures

These HTML entities are **NOT** valid in XML and will cause errors:
- `&plus;` → Should be `+` or `&amp;plus;`
- `&minus;` → Should be `-` or `&amp;minus;`
- `&times;` → Should be `×` or `&amp;times;`
- `&divide;` → Should be `÷` or `&amp;divide;`
- `&nbsp;` → Should be space or `&#160;`
- `&hellip;` → Should be `...` or `&#8230;`
- `&middot;` → Should be `·` or `&#183;`
- `&copy;` → Should be `©` or `&#169;`
- Any custom/named HTML entity not in XML spec

### Valid XML Entities (Won't Cause Errors)

These are the ONLY 5 predefined XML entities that work:
- `&lt;` → `<`
- `&gt;` → `>`
- `&amp;` → `&`
- `&quot;` → `"`
- `&apos;` → `'`

### Impact on Real SDKs

**Square .NET SDK** (real-world impact):
- CI builds fail completely
- No SDK can be published until fixed
- Affects `ScheduledShiftDetails.cs` model
- Blocks all PR merges that include generated code

## Expected vs Actual Behavior

### Expected Behavior (Correct)

When OpenAPI contains:
```json
"description": "Format is UTC &plus; offset"
```

Generated C# should be:
```csharp
/// <summary>
/// Format is UTC + offset
/// </summary>
```

**OR** (if preserving HTML):
```csharp
/// <summary>
/// Format is UTC &amp;plus; offset
/// </summary>
```

### Actual Behavior (Bug)

Generated C# is:
```csharp
/// <summary>
/// Format is UTC &plus; offset
/// </summary>
```

This is invalid XML because `&plus;` is not a recognized entity.

## Workarounds

### Option 1: Fix OpenAPI Source (Temporary)
Replace HTML entities in OpenAPI descriptions:
- `&plus;` → `+`
- `&minus;` → `-`
- `&times;` → `×` (use Unicode)
- `&divide;` → `÷` (use Unicode)

### Option 2: Post-Generation Fix (Not Sustainable)
Manually edit generated files after each generation (not recommended for Fern-managed SDKs).

### Option 3: Disable XML Documentation Validation (Not Recommended)
```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);CS1570;CS1571;CS1572;CS1573;CS1574;CS1580;CS1581;CS1584;CS1591;CS1592</NoWarn>
</PropertyGroup>
```

## Required Fix Location

**This bug must be fixed in the Fern C# SDK Generator itself:**
- Component: `fernapi/fern-csharp-sdk` generator
- Version affected: v2.6.0 (and likely all versions)
- Required change: HTML-decode entity references before embedding in XML doc comments
- Fix logic: Convert HTML entities to actual characters or XML-safe equivalents

## Verification Checklist

After running reproduction steps, verify:
- [ ] Generated C# file contains `&plus;` in XML doc comments
- [ ] `dotnet build` fails with XML entity errors
- [ ] Error message mentions "undeclared entity 'plus'"
- [ ] Valid entities like `&lt;` do NOT cause errors
- [ ] Compilation succeeds if HTML entities are removed from OpenAPI

## Additional Test Cases

### Test Case 1: Multiple Entities
```json
"description": "Calculate: A &plus; B &minus; C &times; D &divide; E"
```
Should fail with 4 entity errors.

### Test Case 2: Mixed Valid/Invalid
```json
"description": "Range: A &lt; X &plus; Y &gt; B"
```
Should fail only for `&plus;`, not `&lt;` or `&gt;`.

### Test Case 3: Entity in Multiple Fields
```json
{
  "field1": {"description": "Value &plus; 1"},
  "field2": {"description": "Value &plus; 2"},
  "field3": {"description": "Value &plus; 3"}
}
```
Should fail for all three fields.

## Environment Information

- **Fern CLI Version:** Latest (as of generation)
- **Generator:** `fernapi/fern-csharp-sdk:2.6.0`
- **.NET SDK:** 6.0+ (any version that validates XML doc comments)
- **Operating System:** Any (Windows, macOS, Linux)

## Related Issues

This bug affects:
- OpenAPI specs from external sources (e.g., Square API)
- Any documentation containing mathematical notation
- Time zone offset notation (`+05:30`)
- Scientific/technical documentation with HTML entities
- Migration from HTML-based docs to OpenAPI

## Success Criteria for Fix

A proper fix should:
1. Convert HTML entities to actual Unicode characters OR
2. Escape HTML entities as XML-safe equivalents OR
3. Provide configuration option for entity handling strategy

Example fixed output:
```csharp
/// <summary>
/// Format is UTC + offset notation (e.g., +05:30)
/// </summary>
public string TimeZoneOffset { get; set; }
```

---

## Quick Start Command Sequence

For convenience, here's the complete command sequence:

```bash
# Setup
mkdir fern-xml-entity-bug && cd fern-xml-entity-bug

# Create OpenAPI spec (paste JSON content from Step 2)
cat > openapi.json << 'EOF'
{
  "openapi": "3.0.0",
  "info": {"title": "XML Entity Bug Test", "version": "1.0.0"},
  "paths": {},
  "components": {
    "schemas": {
      "TimeZoneModel": {
        "type": "object",
        "properties": {
          "timeZoneOffset": {
            "type": "string",
            "description": "Format is UTC &plus; offset (e.g., &plus;05:30)"
          }
        }
      }
    }
  }
}
EOF

# Initialize Fern
fern init

# Create generators config
mkdir -p fern
cat > fern/generators.yml << 'EOF'
api:
  specs:
    - openapi: ../openapi.json

groups:
  csharp-sdk:
    generators:
      - name: fernapi/fern-csharp-sdk
        version: 2.6.0
        output:
          location: local-file-system
          path: ./generated-sdk
        config:
          namespace: XmlEntityBugTest
EOF

# Generate SDK
fern generate --group csharp-sdk

# Verify bug in generated code
grep -n "&plus;" generated-sdk/src/XmlEntityBugTest/TimeZoneModel.cs

# Attempt build (will fail)
cd generated-sdk
dotnet build
```

Expected final output: Build failures with XML entity errors.
