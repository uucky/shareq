# ShareQ

A self-hosted KTV webapp.

## CI

GitHub Actions is configured to run tests build GHCR Docker images. See `./.github/workflows`.

## Release

Use `./scripts/release.sh` to create a new release when necessary.

## Deployment

The app the deployed on home server. There are two instances: beta and production.

- beta instance is using `:master` GHCR tag -> auto-updates on instance restarts
- production instance is using an explictly set `:vX.X.X` tag -> manual updates only

Deployment needs to go to TrueNAS dashboard and do the updates themselves.
