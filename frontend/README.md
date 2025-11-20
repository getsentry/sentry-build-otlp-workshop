# OTEL E-commerce Frontend

A clean, modern React e-commerce frontend designed to demonstrate distributed tracing between Sentry SDK (frontend) and OpenTelemetry (backend).

## Features

- **React 18** with Vite for fast development
- **React Router** for client-side navigation
- **Clean, modern UI** without heavy CSS frameworks
- **Shopping cart** functionality
- **Product browsing** and detail views
- **Checkout flow** with order creation
- **Ready for Sentry instrumentation** (add Sentry SDK to enable distributed tracing)

## Prerequisites

- Node.js 18+
- Backend API running on `localhost:3000` (see `otel-ecommerce-api`)

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

## Project Structure

```
src/
├── api/
│   └── client.js          # API client for backend calls
├── components/
│   ├── Header.jsx         # Navigation header with cart badge
│   ├── ProductCard.jsx    # Product card for grid display
│   └── Cart.jsx           # Shopping cart component
├── pages/
│   ├── ProductList.jsx    # Browse all products
│   ├── ProductDetail.jsx  # Single product view
│   └── Checkout.jsx       # Cart and checkout flow
├── App.jsx                # Main app with routing & cart state
├── App.css                # Clean, modern styles
└── main.jsx               # Entry point
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Usage Flow

1. **Browse Products** - View all products on the home page
2. **Product Details** - Click any product to see details
3. **Add to Cart** - Select quantity and add items to cart
4. **Checkout** - Review cart and place order
5. **Order Complete** - Confirmation and redirect

## Adding Sentry Instrumentation

To enable distributed tracing with the OTEL backend:

1. Install Sentry SDK:
```bash
npm install @sentry/react
```

2. Create `src/sentry.js` with your configuration

3. Import in `main.jsx` before other imports

See the `DISTRIBUTED_TRACING_PLAN.md` in the backend repo for detailed setup instructions.

## API Integration

The frontend calls these backend endpoints:

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `GET /api/products/search?q=` - Search products
- `POST /api/orders` - Create order

All API calls are in `src/api/client.js` for easy modification.

## Styling

The app uses custom CSS with:
- CSS variables for consistent theming
- Modern gradient backgrounds
- Responsive grid layouts
- Clean, minimal design
- No external CSS libraries (keeping focus on tracing demo)

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory, ready to deploy to any static hosting service.

## Next Steps

- Add Sentry SDK for distributed tracing
- Customize product images/emojis
- Add user authentication
- Implement search functionality
- Add product categories/filtering

## License

MIT
