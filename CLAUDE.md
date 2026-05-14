# CLAUDE.md

## Project Structure
- **ERP Frontend**: `c:\Users\RAZONOVA\Desktop\Petrochemical\erp` - Next.js frontend
- **ERP Backend**: `c:\Users\RAZONOVA\Desktop\Petrochemical\AG-ERP-Backend` - Express.js backend

## Important: No `src` folder
All frontend code (Redux, types, services, pages, components) MUST be placed in the **app folder** structure, NOT in a `src` folder. The project uses Next.js App Router with the root `app` directory.

## Folder Structure
```
erp/
├── app/
│   ├── store/          # Redux store (index.ts, hooks.ts, authSlice.ts, usersSlice.ts, Providers.tsx)
│   ├── types/          # TypeScript types (api.ts)
│   ├── services/       # API services (api.ts, auth.service.ts, user.service.ts)
│   ├── login/          # Login page
│   ├── dashboard/      # Dashboard pages
│   ├── users/          # User management pages
│   ├── layout.tsx      # Root layout with Providers
│   └── page.tsx        # Home page
├── components/         # UI components (ui/, layout/, tables/)
├── lib/               # Utility functions
└── data/              # Mock data
```

## API Configuration
- Backend runs on `http://localhost:5100`
- Frontend uses `NEXT_PUBLIC_API_URL` environment variable
- API uses HTTP-only cookies for authentication (cookieAuth)