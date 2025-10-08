# Swifty API - Clean Architecture

This project follows **Clean Architecture** principles with clear separation of concerns across four main layers.

## 📁 Folder Structure

```
src/
│
├── presentation/               # Layer 1: Controllers, Routes, Middleware (API layer)
│   ├── controllers/           # Handle HTTP requests/responses
│   ├── routes/                # Define API endpoints
│   ├── middleware/            # Authentication, error handling, etc.
│   └── validators/            # Request validation
│
├── application/               # Layer 2: Use cases (business flow coordination)
│   ├── use-cases/            # Business logic orchestration
│   ├── dtos/                 # Data Transfer Objects
│   ├── mappers/              # Convert between domain ↔︎ DTOs
│   └── interfaces/           # Contracts for dependency inversion
│
├── domain/                    # Layer 3: Core business rules, entities, and logic
│   ├── entities/             # Core business models
│   ├── value-objects/        # Immutable value types
│   ├── services/             # Pure domain services (no dependencies)
│   └── events/               # Domain events
│
├── infrastructure/            # Layer 4: Frameworks, DB, external services
│   ├── persistence/
│   │   ├── models/           # ORM/ODM models
│   │   └── repositories/     # Repository implementations
│   ├── services/             # External service integrations
│   ├── config/               # Configuration files
│   └── logger/               # Logging setup
│
├── shared/                    # Common utilities and shared code
│   ├── errors/               # Custom error classes
│   ├── utils/                # Helper functions
│   └── constants/            # Application constants
│
└── index.js                   # Application entrypoint
```

## 🏗️ Architecture Layers

### 1. Presentation Layer
- **Responsibility**: Handle HTTP requests and responses
- **Dependencies**: Application layer (use cases)
- **Components**:
  - Controllers: Process HTTP requests
  - Routes: Define API endpoints
  - Middleware: Authentication, validation, error handling
  - Validators: Input validation

### 2. Application Layer
- **Responsibility**: Orchestrate business logic and coordinate use cases
- **Dependencies**: Domain layer, interfaces
- **Components**:
  - Use Cases: Implement specific business flows
  - DTOs: Define data transfer structures
  - Mappers: Convert between domain entities and DTOs
  - Interfaces: Define contracts for infrastructure

### 3. Domain Layer
- **Responsibility**: Core business logic and rules (framework-agnostic)
- **Dependencies**: None (pure business logic)
- **Components**:
  - Entities: Core business models
  - Value Objects: Immutable value types
  - Domain Services: Pure business logic
  - Events: Domain events for event-driven architecture

### 4. Infrastructure Layer
- **Responsibility**: External concerns (database, APIs, frameworks)
- **Dependencies**: Application interfaces
- **Components**:
  - Persistence: Database models and repositories
  - Services: External service integrations (email, JWT, etc.)
  - Config: Environment and database configuration
  - Logger: Logging implementation

### 5. Shared Layer
- **Responsibility**: Common utilities used across all layers
- **Components**:
  - Errors: Custom error classes
  - Utils: Helper functions
  - Constants: Application-wide constants

## 🔄 Dependency Flow

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                              Shared
```

**Key Principles**:
- Inner layers never depend on outer layers
- Dependencies point inward (Dependency Inversion)
- Domain layer has no external dependencies
- Infrastructure implements interfaces defined in application layer

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the application**:
   ```bash
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

## 📝 Adding New Features

### Example: Adding a new entity (e.g., Product)

1. **Domain Layer**: Create entity
   ```javascript
   // src/domain/entities/product.entity.js
   export class Product { ... }
   ```

2. **Application Layer**: Create use cases and DTOs
   ```javascript
   // src/application/use-cases/product/create-product.usecase.js
   // src/application/dtos/product.dto.js
   // src/application/interfaces/iproduct.repository.js
   ```

3. **Infrastructure Layer**: Implement repository
   ```javascript
   // src/infrastructure/persistence/models/product.model.js
   // src/infrastructure/persistence/repositories/product.repository.js
   ```

4. **Presentation Layer**: Create controller and routes
   ```javascript
   // src/presentation/controllers/product.controller.js
   // src/presentation/routes/product.routes.js
   ```
