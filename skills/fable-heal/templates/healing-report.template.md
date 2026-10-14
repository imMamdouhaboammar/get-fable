# Security Remediation Report

**Timestamp:** {{timestamp}}  
**Attestation Seal:** `{{attestationSha256}}`  
**Total Findings Evaluated:** {{totalFindings}}  
**Patches Generated:** {{patchesGenerated}}  
**Patches Applied:** {{patchesApplied}}  
**Mode:** {{mode}}  

## Remediated Vulnerabilities

| Finding ID | Category | Severity | Strategy | Status |
| :--- | :--- | :--- | :--- | :--- |
{{#patches}}
| `{{findingId}}` | `{{category}}` | **{{severity}}** | `{{strategy}}` | {{status}} |
{{/patches}}

## Generated Regression Test Guard

```typescript
{{testCode}}
```
