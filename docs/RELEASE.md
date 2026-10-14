# Release policy

Releases must start from a reviewed commit with fresh CI evidence after the last mutation.

The npm workflow is `.github/workflows/release.yml`. It is triggered by a published non-prerelease GitHub Release, runs repository checks and a package dry run, verifies the GitHub release tag matches `package.json`, then uses npm Trusted Publishing through GitHub OIDC.

Required external configuration that is not stored in this repository:

- an npm Trusted Publisher bound to this repository and workflow filename
- a protected GitHub environment named `npm`
- repository rules that require the intended CI/security checks before release

No long-lived npm token is part of the workflow. Publishing must not be simulated by adding a secret token fallback.

Before a release, inspect the actual tarball contents and confirm that developer-only holdouts, tests, coverage output, internal plans, and historical root material are absent.
