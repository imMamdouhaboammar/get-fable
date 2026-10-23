# Repository settings checklist

The repository files can prove workflow configuration, but they cannot prove organization or repository settings that live only in GitHub administration. Those items are marked **NOT SHOWN** until verified through repository settings or API evidence.

| Setting | Repository evidence | Status |
| --- | --- | --- |
| Branch/ruleset requires CI before merge | No repository-local proof | NOT SHOWN |
| Branch/ruleset blocks force-pushes to protected release branches | No repository-local proof | NOT SHOWN |
| Required approving reviews | No repository-local proof | NOT SHOWN |
| Code owner review requirement | `.github/CODEOWNERS` exists, enforcement is a setting | NOT SHOWN |
| GitHub secret scanning | Depends on repository/security settings | NOT SHOWN |
| Push protection | Depends on repository/security settings | NOT SHOWN |
| Dependabot alerts | `.github/dependabot.yml` configures update PRs, alert setting is external | NOT SHOWN |
| npm Trusted Publisher | Release workflow expects OIDC, npm-side binding is external | NOT SHOWN |
| Protected GitHub environment `npm` | Workflow references it, protection policy is external | NOT SHOWN |

Before M5 or a production release, verify these settings directly and bind the evidence to the release revision.
