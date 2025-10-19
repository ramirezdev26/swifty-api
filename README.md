# Swifty API

A Node.js REST API built with Express.js, featuring clean architecture, Docker containerization, and automated CI/CD deployment to GitLab Container Registry.

## 🚀 Features

- **Clean Architecture**: Domain-driven design with separation of concerns
- **Docker Containerization**: Multi-stage builds with security best practices
- **GitLab CI/CD**: Automated testing, building, and deployment pipelines
- **Semantic Versioning**: Automated version management and tagging
- **Security Scanning**: Integrated vulnerability scanning for containers and dependencies
- **Multi-Environment Deployment**: Staging and production environments with rollback capabilities
- **Health Checks**: Built-in health check endpoints for container orchestration
- **PostgreSQL Integration**: Database persistence with Sequelize ORM and retry logic
- **Firebase Integration**: Cloud services integration with graceful degradation
- **Database Resilience**: Automatic connection retry with exponential backoff

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (for local development)
- GitLab account (for CI/CD)

## 🗄️ Database Setup

The API uses **PostgreSQL with Sequelize ORM**. Database tables are **automatically created** when the application starts through Sequelize model synchronization.

### Database Models
- **User Model**: Stores user information with Firebase authentication integration
- **Automatic Table Creation**: Tables are created/updated automatically on startup
- **Migrations**: Uses Sequelize sync (not migrations) for simplicity

### Environment Variables
```bash
# Required for database connection
DB_HOST=localhost          # PostgreSQL host
DB_PORT=5432              # PostgreSQL port
DB_USERNAME=swifty_user    # Database username
DB_PASSWORD=swifty_password # Database password
DB_NAME=swifty_db         # Database name
```

### Table Creation Process
1. Application connects to PostgreSQL
2. Sequelize reads model definitions
3. `sequelize.sync()` creates/updates tables automatically
4. Logs show: `Database models synced successfully`

## 🛠️ Local Development

### Using Docker Compose (Recommended)

#### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd swifty-api
   ```

2. **Start with default settings (built-in fallbacks)**
   ```bash
   docker compose up --build
   ```

3. **Or use custom environment variables**
   ```bash
   # Method 1: Using .env file
   cp .env.example .env
   # Edit .env with your local configuration
   docker compose --env-file .env up --build

   # Method 2: Inline environment variables
   DB_PASSWORD=mypassword FRONTEND_URL=http://localhost:4200 docker compose up --build

   # Method 3: Export variables first
   export DB_PASSWORD=mypassword
   export FRONTEND_URL=http://localhost:4200
   docker compose up --build

   # Method 4: Using .env file (automatic if named .env)
   echo "DB_PASSWORD=mypassword" > .env
   echo "FRONTEND_URL=http://localhost:4200" >> .env
   docker compose up --build

   # Method 5: Using a custom env file
   echo "DB_PASSWORD=mypassword" > .env.local
   echo "FRONTEND_URL=http://localhost:4200" >> .env.local
   docker compose --env-file .env.local up --build
   ```

### Example .env File for Local Testing

Create a `.env` file in the project root:

```bash
# Copy the example and modify
cp .env.example .env

# Or create manually
cat > .env << EOF
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
FRONTEND_URL=http://localhost:4200

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=swifty_user
DB_PASSWORD=your_custom_password
DB_NAME=swifty_db

# Firebase (use your real credentials or demo values)
FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=demo-key
FIREBASE_CLIENT_EMAIL=demo@demo.com
FIREBASE_DATABASE_URL=https://demo.firebaseio.com
FIREBASE_STORAGE_BUCKET=demo.appspot.com
EOF
```

4. **Check the logs**
   ```bash
   docker compose logs -f swifty-api
   ```

#### Database Connection Testing

The application includes automatic database connection retry logic:

```bash
# Test with custom retry settings
DB_CONNECTION_RETRIES=20 DB_CONNECTION_TIMEOUT=10000 docker compose up --build

# Test with external database
DB_HOST=external-db.com DB_PORT=5432 DB_PASSWORD=prod_password docker compose up --build

# Test database connectivity manually
docker compose exec postgres pg_isready -U swifty_user -d swifty_db
```

#### GitLab CI/CD Environment

The docker-compose.yml automatically uses GitLab environment variables with fallback defaults:

```bash
# GitLab CI/CD automatically injects environment variables
docker compose -f docker-compose.yml -f docker-compose.gitlab.yml up -d
```

Or set specific variables inline:
```bash
DB_HOST=your-db-host DB_PASSWORD=your-password docker compose up -d
```

For GitLab CI/CD deployments, set these environment variables in your project settings:
- All variables listed in the "GitLab CI/CD Variables" section above
- The docker-compose.yml will automatically use these values with proper fallbacks

The API will be available at `http://localhost:3000` with the following endpoints:
- Health check: `GET /api/health`
- API documentation: Check individual route files for endpoints

### Manual Setup (Alternative)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE swifty_db;
   CREATE USER swifty_user WITH PASSWORD 'swifty_password';
   GRANT ALL PRIVILEGES ON DATABASE swifty_db TO swifty_user;
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Firebase credentials
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🐳 Docker Commands

### Build the image
```bash
docker build -t swifty-api .
```

### Run the container
```bash
docker run -p 3000:3000 --env-file .env swifty-api
```

### Health check
```bash
curl http://localhost:3000/api/health
```

## 🚢 Deployment

### GitLab CI/CD Pipeline

The project uses GitLab CI/CD with the following stages:

1. **Validate**: Linting and formatting checks
2. **Test**: Unit tests with coverage reporting
3. **Build**: Docker image creation and registry push
4. **Security**: Vulnerability scanning for containers and dependencies
5. **Package**: Multi-architecture builds for production releases
6. **Deploy**: Environment-specific deployments with rollback capabilities

### Version Management

The pipeline supports semantic versioning:

- **Patch releases** (`1.0.0` → `1.0.1`): Automated on main branch merges
- **Minor releases** (`1.0.0` → `1.1.0`): Manual trigger for new features
- **Major releases** (`1.0.0` → `2.0.0`): Manual trigger for breaking changes

### GitLab CI/CD Variables

Set these variables in your GitLab project settings:

#### Required Variables
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `FIREBASE_DATABASE_URL`: Firebase Realtime Database URL
- `FIREBASE_STORAGE_BUCKET`: Firebase Storage bucket
- `KUBE_INGRESS_BASE_DOMAIN`: Kubernetes ingress domain
- `CI_DOMAIN`: Production domain

#### Optional Variables
- `NODE_ENV`: Environment (development/staging/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `FRONTEND_URL`: Frontend application URL
- `API_PORT`: Port to expose the API (default: 3000)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

### Deployment Process

1. **Development**: Push to feature branches for automatic testing
2. **Staging**: Merge to `main` branch for staging deployment
3. **Production**: Create version tags for production deployment

#### Manual Deployment Steps

1. **Staging Deployment**:
   - Go to GitLab CI/CD → Pipelines
   - Find the latest main branch pipeline
   - Click "Deploy to staging" job

2. **Production Deployment**:
   - Create a version tag: `git tag v1.0.0 && git push origin v1.0.0`
   - Pipeline automatically builds multi-arch images
   - Click "Deploy to production" job

3. **Rollback**:
   - Use the "Rollback production" job in case of issues
   - Previous version will be automatically restored

## 🔒 Security Features

- **Container Security**: Non-root user, minimal attack surface
- **Vulnerability Scanning**: Trivy integration for container scanning
- **Dependency Auditing**: Automated npm audit checks
- **Secret Management**: All sensitive data stored as GitLab CI/CD variables

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.123,
  "version": "1.0.0"
}
```

### Container Health Checks
The Docker image includes built-in health checks that:
- Run every 30 seconds
- Timeout after 3 seconds
- Allow 3 retries before marking unhealthy
- Wait 5 seconds after container start

## 🧪 Testing

### Run tests locally
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run linting
```bash
npm run lint
```

## 📁 Project Structure

```
swifty-api/
├── src/
│   ├── application/          # Application layer (use cases, DTOs)
│   ├── domain/              # Domain layer (entities, services)
│   ├── infrastructure/      # Infrastructure layer (DB, external services)
│   ├── presentation/        # Presentation layer (controllers, routes)
│   └── shared/              # Shared utilities and constants
├── docker/                  # Docker configuration
├── .gitlab/                 # GitLab CI/CD configuration
├── docker-compose.yml       # Local development setup
├── Dockerfile              # Multi-stage container build
├── .dockerignore           # Docker build exclusions
└── .gitlab-ci.yml          # CI/CD pipeline configuration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Troubleshooting

### Common Issues

**Container won't start**
- Check environment variables in `.env` file
- Verify database connectivity
- Check logs: `docker-compose logs swifty-api`

**Pipeline fails**
- Ensure all required CI/CD variables are set
- Check GitLab Runner has Docker access
- Verify registry permissions

**Health check fails**
- Ensure database is accessible
- Check Firebase credentials
- Verify all required environment variables

**Database connection fails**
- Check PostgreSQL container status: `docker compose ps postgres`
- Test database connectivity: `docker compose exec postgres pg_isready -U swifty_user -d swifty_db`
- Verify database credentials in environment variables
- Increase retry attempts: `DB_CONNECTION_RETRIES=20 docker compose up --build`
- Check database logs: `docker compose logs postgres`

### Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed information
3. Include logs and error messages
