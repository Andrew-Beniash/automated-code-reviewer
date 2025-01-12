# Automated Code Reviewer

## Prerequisites
- Node.js >= 18.x
- Docker Desktop
- Git

## Installation
1. Clone the repository
2. Copy .env.example to .env and update values
3. Run `npm install`
4. Start services: `docker-compose up -d`
5. Run migrations: `npm run migration:run`

## Development
- Start development server: `npm run dev`
- Run tests: `npm test`