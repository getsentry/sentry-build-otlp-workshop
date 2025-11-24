# OTEL E-commerce Frontend

## Prerequisites

- Node.js 18+
- Backend API running on `localhost:3000` (see `sentry-build-otlp-workshop-api`)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

The frontend expects the backend API at `http://localhost:3000/api` by default. You can change this in `.env` if needed:

```bash
VITE_API_URL=http://localhost:3000/api
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## License

MIT
