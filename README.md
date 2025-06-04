# Transaction Aggregator Service

This is a data aggregation microservice that collects transactions from a transaction API and exposes its own API endpoints for aggregated data.

## Features

- Collects transaction data from a mock transaction API
- Aggregates transaction data by user
- Provides API endpoints for:
  - Getting aggregated data by user ID (balance, earned, spent, payout, paid out)
  - Getting a list of requested payouts (user ID, payout amount)
- Uses MongoDB in-memory database for data storage

## Installation

```bash
# Install dependencies
npm install
```

## Running the application

```bash
# Development mode
npm run start

# Watch mode
npm run start:dev

# Production mode
npm run start:prod
```

## API Endpoints

### Get Aggregated Data by User ID

```
GET /transactions/aggregated/:userId
```

Returns aggregated data for a specific user:
- `userId`: User ID
- `balance`: Current balance
- `earned`: Total amount earned
- `spent`: Total amount spent
- `payout`: Total payout requested
- `paidOut`: Total amount paid out

### Get Requested Payouts

```
GET /transactions/payouts
```

Returns a list of requested payouts aggregated by user:
- `userId`: User ID
- `amount`: Total payout amount requested

## Testing Strategy

The application uses a comprehensive testing approach:

1. **Unit Tests**: Testing individual components in isolation
   - Services
   - Controllers
   - Models

2. **Integration Tests**: Testing interactions between components
   - API endpoints
   - Database operations

3. **End-to-End Tests**: Testing the complete application flow

To run tests:

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Architecture

The application follows a modular architecture:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic
- **Models**: Define data structures
- **Schemas**: Define database schemas

## Design Decisions

- **In-Memory MongoDB**: Used for simplicity and ease of testing
- **Periodic Sync**: Ensures data is up-to-date with less than 2 minutes delay
- **Rate Limiting**: Respects the transaction API rate limit (5 requests per minute)
- **Aggregation**: Efficiently aggregates data using MongoDB aggregation pipeline

## Future Improvements

If I had more time, I would implement the following improvements:

### Bull Queue for Transaction Synchronization

I would replace the current cron-based synchronization with Bull, a Redis-based queue for Node.js, to improve the robustness and scalability of the transaction synchronization process:

- **Reliable Job Processing**: Bull provides persistent job storage in Redis, ensuring no jobs are lost even if the service crashes
- **Automatic Retries**: Configure automatic retries with exponential backoff for failed API requests
- **Concurrency Control**: Fine-grained control over job concurrency to optimize performance while respecting API rate limits
- **Distributed Processing**: Enable horizontal scaling by distributing jobs across multiple worker instances
- **Monitoring and Visibility**: Built-in monitoring and UI for tracking job status, failures, and performance metrics
- **Event-Based Architecture**: Move from polling to an event-driven approach for more efficient resource usage
- **Prioritization**: Implement job prioritization for critical synchronization tasks

Implementation would involve:
1. Adding Redis and Bull as dependencies
2. Creating a dedicated queue for transaction synchronization
3. Converting the current sync logic to Bull job processors
4. Implementing proper error handling and retry strategies
5. Setting up monitoring for queue health and performance


## Testing Approach

### 1. Unit Testing

Unit tests focus on testing individual components in isolation:

- **Services**: Test business logic in isolation by mocking dependencies
  - `TransactionAggregatorService`: Test aggregation logic
  - `MockTransactionApiService`: Test API simulation

- **Controllers**: Test request handling and response formatting
  - `TransactionController`: Test API endpoints

- **Models and Schemas**: Test data validation and transformation

#### TDD Approach for Unit Tests

1. Write test cases first, defining expected behavior
2. Implement the minimal code to make tests pass
3. Refactor while keeping tests passing

### 2. Integration Testing

Integration tests focus on testing interactions between components:

- **Service-to-Database**: Test database operations
  - Test transaction storage and retrieval
  - Test aggregation queries

- **Controller-to-Service**: Test API flow
  - Test endpoint-to-service communication
  - Test error handling and edge cases

#### TDD Approach for Integration Tests

1. Define expected interactions between components
2. Write tests that verify these interactions
3. Implement components to satisfy the tests

### 3. End-to-End Testing

E2E tests focus on testing the complete application flow:

- **API Endpoints**: Test full request-response cycle
  - Test `/transactions/aggregated/:userId` endpoint
  - Test `/transactions/payouts` endpoint

- **Data Synchronization**: Test periodic sync functionality
  - Test data is up-to-date within the required time frame

#### TDD Approach for E2E Tests

1. Define user stories and acceptance criteria
2. Write E2E tests based on these criteria
3. Implement features to satisfy the tests

### 4. Performance Testing

Performance tests focus on ensuring the service meets performance requirements:

- **Load Testing**: Test service under expected load
  - Test with simulated high transaction volume
  - Test with multiple concurrent API requests

- **Scalability Testing**: Test service's ability to scale
  - Test with increasing data volume
  - Test with increasing request rate

### 5. Reliability Testing

Reliability tests focus on ensuring the service is robust:

- **Fault Tolerance**: Test service's ability to handle failures
  - Test with simulated API failures
  - Test with database connection issues

- **Recovery Testing**: Test service's ability to recover
  - Test data consistency after failures
  - Test automatic recovery mechanisms

## Test Implementation

### Tools and Frameworks

- **Jest**: Primary testing framework
- **Supertest**: HTTP testing
- **MongoDB Memory Server**: In-memory MongoDB for testing

### Test Organization

- **Unit Tests**: Located in `src/**/*.spec.ts`
- **Integration Tests**: Located in `test/*.spec.ts`
- **E2E Tests**: Located in `test/*.e2e-spec.ts`

### Continuous Integration

- Run all tests on every pull request
- Run performance tests on scheduled basis
- Generate and publish test coverage reports

## TDD Implementation

If more time were available, the TDD approach would be implemented as follows:

1. **Define Requirements**: Clearly define what each component should do
2. **Write Tests First**: Create tests that define expected behavior
3. **Implement Minimal Code**: Write just enough code to make tests pass
4. **Refactor**: Improve code quality while keeping tests passing
5. **Repeat**: Continue the cycle for each new feature or component

### Example TDD Workflow for a Feature

1. **Write a failing test** for the feature (e.g., getting aggregated data by user ID)
2. **Implement the minimal code** to make the test pass
3. **Refactor the code** to improve quality and maintainability
4. **Add more test cases** for edge cases and error conditions
5. **Enhance the implementation** to handle these cases
6. **Continue until** the feature is complete and robust

This approach ensures that:
- All code is testable by design
- Requirements are clearly understood before implementation
- Code quality is maintained throughout development
- Regression issues are caught early