# Development Guide

This guide covers development setup and practices for the Survivor Fantasy League codebase.

## Prerequisites

- Node.js 20+
- npm 10+
- Git

## Project Structure

```
rgfl-survivor/
├── web/                 # React frontend (Vite + TypeScript)
├── server/              # Express API server
├── mobile/              # React Native mobile app (placeholder)
├── supabase/            # Database migrations and config
│   └── migrations/      # SQL migration files
├── eslint.config.js     # ESLint configuration
├── .prettierrc          # Prettier configuration
├── .editorconfig        # Editor settings
└── package.json         # Root package.json with workspaces
```

## Getting Started

### 1. Install dependencies

```bash
npm install                    # Install all dependencies
cd server && npm install       # Server has its own package.json
```

### 2. Set up environment variables

Create `.env` files:

**Server (`server/.env`):**
```env
NODE_ENV=development
PORT=3001

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

CORS_ORIGIN=http://localhost:5173

# Optional
STRIPE_SECRET_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
RESEND_API_KEY=
```

**Web (`web/.env`):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### 3. Run development servers

```bash
# Run both frontend and API
npm run dev:all

# Or run separately
npm run dev         # Frontend only (port 5173)
npm run dev:server  # API only (port 3001)
```

## Available Scripts

### Root

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run dev:server` | Start API server |
| `npm run dev:all` | Start both servers |
| `npm run build` | Build frontend |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |

### Server

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled server |

### Web

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Code Style

### TypeScript

- Use strict mode
- Prefer `const` over `let`
- Use explicit return types for exported functions
- Use `unknown` instead of `any` when possible

### React

- Use functional components with hooks
- Use React Query for server state
- Colocate components with their styles
- Use absolute imports from `src/`

### API Routes

- Use Zod for input validation
- Handle errors consistently
- Never expose internal errors to clients
- Use typed request/response objects

## Testing

```bash
# Run all tests (when available)
npm test

# Run with coverage
npm run test:coverage
```

## Database

### Migrations

Migrations are in `supabase/migrations/`. Apply them via Supabase CLI or dashboard.

```bash
# Apply migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --local > web/src/types/supabase.ts
```

### Row Level Security

All tables use RLS. Key policies:
- Users can only see their own data
- League members can see league data
- Admins bypass RLS via service role

## Deployment

### Frontend (Vercel)

1. Connect GitHub repo
2. Set environment variables
3. Deploy main branch

### API (Railway/Render)

1. Set environment variables
2. Deploy from `server/` directory
3. Ensure `CORS_ORIGIN` is set

## Security Practices

1. **Rate Limiting**: All endpoints are rate-limited
2. **Input Validation**: Zod schemas validate all input
3. **Helmet**: Security headers on all responses
4. **CORS**: Strict origin checking in production
5. **Secrets**: Never commit `.env` files

## Common Issues

### "CORS_ORIGIN not set"
Set `CORS_ORIGIN` environment variable to your frontend URL.

### "Supabase auth failed"
Check that `SUPABASE_ANON_KEY` is correct and not expired.

### "Rate limited"
Wait 60 seconds or check rate limit configuration.

## Contributing

1. Create a feature branch
2. Make changes with passing lint/tests
3. Submit a pull request
4. Wait for review

## Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com)
