# Weather App

A full-stack weather application built with Next.js, Express, and the Better-T-Stack, providing historical average temperature data for locations around the world.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Express** - Fast, unopinionated web framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Biome** - Linting and formatting

## Getting Started

This project can be set up either locally or using Docker Compose.

### Environment Setup

Create a `.env` file in the root directory with the following environment variables:

```bash
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=weatherapp

# Server Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/weatherapp
CORS_ORIGIN=http://localhost:3001
PORT=3000

# Web Configuration
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
WEB_PORT=3001

WEATHEER_BACKEND_URL=http://localhost:3000

# Cypress Testing
CYPRESS_BASE_URL=http://localhost:3001
```

### Option 1: Local Development

1. Install dependencies:

```bash
bun install
```

2. Database Setup:

   Make sure you have PostgreSQL installed and running, then apply the schema:
   ```bash
   bun db:push
   ```

3. Run the development server:

```bash
bun dev
```

### Option 2: Docker Compose

For a containerized development environment with automatic hot reloading:

```bash
docker-compose -f docker-compose.dev.yml up --build -d
```

This will start:
- PostgreSQL database on port 5432
- Backend API server on port 3000
- Web app on port 3001

### Accessing the Application

- Web App: [http://localhost:3001](http://localhost:3001)
- API Server: [http://localhost:3000](http://localhost:3000)
- API Documentation: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)



## Project Structure

```
full-weather-app/
├── apps/
│   ├── web/                 # Frontend application (Next.js)
│   │   ├── src/             # React components and pages
│   │   ├── cypress/         # End-to-end tests
│   │   └── public/          # Static assets
│   └── server/              # Backend API (Express, ORPC)
│       ├── src/             # Server source code
│       │   ├── routers/     # API routes and controllers
│       │   └── lib/         # Utilities and shared code
│       └── drizzle/         # Database schema and migrations
├── docker-compose.yml       # Production Docker configuration
├── docker-compose.dev.yml   # Development Docker configuration
└── .env                     # Environment variables
```

## Application Features

### Weather API
- Historical weather data retrieval from external services
- Average temperature calculation for specified locations
- Configurable date range (1-365 days in the past)
- OpenAPI/Swagger documentation at `/api-docs`

### Web Interface
- Clean, responsive UI built with TailwindCSS and shadcn/ui
- Location search with autocomplete
- Adjustable time range slider
- Interactive temperature chart
- API health status indicator

## Available Scripts

### Development
- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps

### Database
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
- `bun db:generate`: Generate migrations
- `bun db:migrate`: Run database migrations

### Testing
- `bun test:web`: Run Cypress tests in headless mode
- `bun test:web:open`: Open Cypress test runner
- `bun test:server`: Run Jest tests for the server

### Code Quality
- `bun check`: Run Biome formatting and linting


## Additonal Notes on development

- Although I do have the drizzle and postgres setup all up on and running, and when using docker compose it will successfully initiate and even run the migrations, I did not find the time or proper flow to implement a database in this application, as the mateo-api already has historical data you can retrieve from it, it would've added alot of overhead in testing as well as the amount of time it would've taken to implement the database and the API around it as a fallback, that I decided to not implement this part of the application.

- This app is also not currently deployed on any platform, as I did not find the time to implement a proper deployment pipeline for this application. A mono-repo although handy, can be a bit of a pain to manage and deploy, and I did not find the time to implement a proper deployment pipeline for this application.