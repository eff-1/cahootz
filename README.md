# Cahootz

> Learn together. Go further.

A social learning and study-commitment platform for university students.

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9, Docker

# 1. Clone and install
pnpm install

# 2. Start infrastructure (Postgres, Redis, Mailpit)
pnpm docker:up

# 3. Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Run database migrations and seed
pnpm db:migrate
pnpm db:seed

# 5. Start development servers
pnpm dev
```

- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **Mailpit**: http://localhost:8025 (email testing)
- **Redis Commander**: http://localhost:8081

## Project Structure

```
cahootz/
├── apps/
│   ├── api/          # NestJS modular monolith backend
│   ├── web/          # Next.js frontend
│   ├── worker/       # BullMQ background job worker
│   └── admin/        # Admin dashboard (MFA required)
├── packages/
│   └── shared/       # Shared types, schemas, constants
├── docs/             # Project documentation
├── infra/            # Docker compose, IaC skeleton
└── ...config files
```

## Documentation

See [docs/CAHOOTZ/README.md](docs/CAHOOTZ/README.md) for the complete project documentation.

## License

Proprietary. All rights reserved.

