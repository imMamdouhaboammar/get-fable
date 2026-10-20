# Cypress E2E & Browser Testing Guide

Guide for executing, debugging, and maintaining Cypress end-to-end browser tests in `get-fable`.

---

## 1. Role in the Test Pyramid

Cypress operates at **Tier 5** of the Fable test pyramid. While unit and integration tests verify algorithms, state machines, and protocols in isolation, Cypress verifies the holistic developer experience:
- Interactive web portal (`site/`)
- Documentation navigation and markdown rendering
- Dashboard tiles and real-time state synchronization
- Responsive layout across viewports

---

## 2. Running Cypress Locally

### Smoke Mode (Fast)
To run headless smoke tests against a local server:

```bash
bun run test:cypress:smoke
```

### Full E2E Test Suite
To run all specs in headless Chrome:

```bash
bun run test:cypress
```

### Interactive Test Runner (Debugging)
To launch the interactive Cypress GUI:

```bash
bun run cypress:open
```

---

## 3. Best Practices & Flakiness Prevention

1. **Deterministic Bounded Server:** Cypress tests run against a lightweight local static server started before the suite runs and terminated cleanly afterward.
2. **Data-Testid Selectors:** Always select elements using `data-testid` or accessible role attributes (`role="button"`, `role="navigation"`), never brittle CSS classes or deep DOM paths.
3. **No Arbitrary `cy.wait(ms)`:** Never use hardcoded sleep timeouts. Use affirmative assertions that wait on conditions:
   ```javascript
   // Anti-pattern
   cy.wait(2000);

   // Correct
   cy.get('[data-testid="status-badge"]').should('contain.text', 'complete');
   ```
4. **Clean Session State:** Reset local storage and cookies before each test spec to prevent state leakage between runs.
