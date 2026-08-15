# Remix of Property Nexus

use the propertyportal and the hmodev.313test.co.uk developed to build a saas that is better than rightmove, bayut, arthuronline.co.uk, reapit.com, rexsoftware.com, dezrez, altosoftware, street.co.uk, domus, crm, marketplace, hmo management, estate agents and letting and sales agent and all services from the softwares

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fb1d337d-6e49-43e5-9b49-84486a9171ab).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
npm run dev
```

## Production security

Set the production values documented in `.env.example` and run `npm run check`, the production
dependency audit and `npm run launch:preflight` before release. Platform administrator access
requires the MFA flow at `/security/mfa` plus explicit service-role provisioning; follow the
fail-closed procedure in [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

Database migrations are append-only and hash-pinned. Run `npm run migrations:verify` before
opening a pull request and follow [`docs/DATABASE_RELEASE_RUNBOOK.md`](docs/DATABASE_RELEASE_RUNBOOK.md)
when adding or deploying a migration.
