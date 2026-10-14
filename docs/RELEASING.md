# Releasing `get-fable`

This repository should not publish from an unverified working tree

## Release checklist

1. Confirm CI is green on the release commit
2. Update `package.json` version intentionally
3. Run the full local check

```bash
bun install
bun run check
npm pack --dry-run --ignore-scripts
```

4. Inspect the package file list and make sure no credentials, local configuration, temporary files, or unrelated assets are included
5. Review `THIRD_PARTY_NOTICES.md` when bundled upstream material changed
6. Create a signed or otherwise verified Git tag where possible
7. Create the GitHub release from that exact commit
8. Publish the npm package only after the npm package identity and publisher configuration are confirmed

## npm publishing

Prefer npm trusted publishing from GitHub Actions instead of storing a long-lived npm token in repository secrets

Trusted publishing uses the CI identity and produces npm provenance when the npm package and workflow are configured for it

Do not add a publish workflow that can release this package until

- the `get-fable` package name is confirmed under the intended npm account
- the trusted publisher is configured for this repository and the exact workflow file
- the release branch or tag policy is decided
- the first dry-run package contents have been reviewed

Until those prerequisites are complete, release automation should stop at build, test, and package inspection

## Rollback

Do not rewrite an existing public tag to point at different code

If a published package contains a defect, publish a new corrected version and document the affected version in the GitHub release notes

If a release accidentally contains sensitive material, follow the relevant provider's credential revocation and incident procedures immediately. Removing the file from a later Git commit does not revoke a leaked credential
