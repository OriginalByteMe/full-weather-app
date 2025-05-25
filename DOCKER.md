# Docker Setup for Weather App

This guide explains how to run the full Weather App using Docker containers.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1. Clone the repository and navigate to the project directory:

```bash
cd full-weather-app
```

2. Create environment variables (or use the defaults in .env.docker):

```bash
cp .env.docker .env
```

3. Build and start the containers:

```bash
docker-compose up -d
```

This will start three containers:
- PostgreSQL database (port 5432)
- Backend server (port 3000)
- Frontend web app (port 3001)

4. Access the application:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000

## Database Migrations

To run database migrations after the containers are up:

```bash
docker-compose exec server bun run db:migrate
```

## Useful Commands

### View logs
```bash
# View logs for all services
docker-compose logs

# View logs for a specific service
docker-compose logs web
docker-compose logs server
docker-compose logs postgres
```

### Stop containers
```bash
docker-compose down
```

### Stop containers and remove volumes
```bash
docker-compose down -v
```

### Rebuild containers
```bash
docker-compose up -d --build
```

## Troubleshooting

### Database Connection Issues
If the server can't connect to the database, ensure PostgreSQL is fully started:

```bash
docker-compose logs postgres
```

Wait until you see "database system is ready to accept connections" before attempting to connect.

### Missing Environment Variables
Make sure your .env file contains all necessary variables or use the provided .env.docker as a template.
