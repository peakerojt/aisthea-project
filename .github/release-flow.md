# Release Flow

## Branch Roles

- `main`: production
- `develop`: staging
- `feature/*`: feature work
- `hotfix/*`: urgent fixes

## Daily Delivery Flow

1. Create a branch from `develop`.
2. Push the branch to GitHub to get a Vercel preview deployment.
3. Open a pull request into `develop`.
4. Wait for CI to pass:
   - install dependencies
   - build server
   - build client
   - test server
   - test client
5. Verify the change on preview and staging.
6. Merge into `develop`.
7. Confirm staging is healthy on `https://staging.aisthea.site`.

## Release Flow

1. Open a pull request from `develop` into `main`.
2. Confirm CI is green on the release PR.
3. Run a short staging smoke test:
   - frontend loads
   - backend health check returns OK
   - login works
   - core product flow works
4. Merge into `main`.
5. Verify production after deploy:
   - frontend loads
   - backend health check returns OK
   - critical user journeys work

## Rollback

If production verification fails:

1. Roll back the frontend using the previous Vercel production deployment.
2. Roll back the backend using the previous Render production deployment.
3. If a database migration caused the issue, pause and restore from backup or run the prepared rollback migration.
4. Open a hotfix branch from `main` for the permanent fix.
