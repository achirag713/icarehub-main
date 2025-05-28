# ICareHub - ICareHub

A comprehensive hospital management solution with separate interfaces for patients, doctors, and administrators.

## Project Structure

This solution consists of two main components:

1. **HospitalManagement.API**: A .NET API backend
2. **hospital-management-frontend**: A React-based frontend

## Features

- User authentication and role-based authorization
- Patient appointment booking and management
- Doctor schedule management
- Medical records tracking
- Billing and payment processing
- Admin dashboard for hospital management

## Setup Instructions

### Prerequisites

- .NET SDK 8.0 or later
- Node.js (v16 or later) and npm
- MySQL Server (or compatible database)

### Backend Setup

1. Navigate to the API project directory:
```
cd HospitalManagement.API
Change the global.json file according to your .net sdk
```

2. Restore packages:
```
dotnet restore and dotnet build
```

3. Update database connection string in `appsettings.json` or using User Secrets (copy the appsettings.example.json file into appsettings.json with your credentials)

4. Apply database migrations:
```
dotnet ef database update
```

5. Run the API:
```
dotnet run
```

### Frontend Setup

1. Navigate to the frontend project directory:
```
cd hospital-management-frontend
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```

## License

[MIT](https://choosealicense.com/licenses/mit/)

N8HLZ283TBRCGXJ7K9EM3PUG
