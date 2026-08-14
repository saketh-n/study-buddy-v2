# Testing

Study Buddy has three test layers: **backend** (pytest), **frontend** (Vitest), and **end-to-end** (Playwright). For E2E and CI-related changes, it is strongly recommended to run the actual GitHub Actions workflow locally with [`act`](https://github.com/nektos/act) before pushing.

## Backend tests

```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html   # with coverage
```

## Frontend tests

```bash
cd frontend
npm run test             # watch mode
npm run test:run         # single run
npm run test:coverage    # with coverage
```

## E2E tests (Playwright)

From the `frontend/` directory:

```bash
npm run test:e2e
npm run test:e2e:ui          # Playwright UI mode
npm run test:e2e:headed      # run in a headed browser
```

If the frontend is running on a port other than `5173`, set `FRONTEND_PORT`:

```bash
FRONTEND_PORT=XXXX npm run test:e2e
```

### Playwright artifacts

When running E2E tests locally or via `act`, Playwright writes:

- HTML report: `frontend/playwright-report/`
- Traces, screenshots, videos: `frontend/test-results/`

View the report with:

```bash
npx playwright show-report frontend/playwright-report
```

Artifact upload steps only run on GitHub Actions and are skipped locally.

## Local CI simulation with `act` ⭐ Recommended

To avoid pushing commits just to test CI or workflow changes, use `act` to run the real GitHub Actions jobs locally. `act` runs workflows **inside Docker containers**, so it is safe: your real local data is not modified, backend seeding only affects the container filesystem, and artifacts are not uploaded anywhere.

**Requirements:** Docker (Desktop or Engine) and `act`:

```bash
brew install act   # macOS
```

Run the comprehensive test suite (backend, frontend, E2E) CI job from the **repo root**:

```bash
ACT=true act -j e2e-tests \
  -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:act-22.04
```

The `ACT=true` flag tells the workflow it's running in a container rather than on GitHub, which ensures Playwright reports are properly accessible.

### Backend data seeding (E2E)

During E2E runs in CI (and `act`), backend data is seeded automatically:

```yaml
- name: Seed backend data for E2E
  run: cp -R backend/sample-data backend/data
```

This runs **inside the container only**. `backend/data` is gitignored and never touches real local data. The sample data includes a fully pre-cached curriculum (lessons and quizzes), so the whole suite runs end-to-end **without an Anthropic API key**.

## Summary

- Use unit tests for fast feedback.
- Use Playwright directly for UI debugging.
- Use `act` to validate CI workflows before pushing.
- E2E seeding is container-only and safe by design — no local data is deleted or overwritten.
