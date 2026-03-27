# Central de Clientes - inout

## Overview
Dashboard de performance para clientes de consultoria estratégica. Hub consolidado que permite analisar funil, investimento e resultados de campanhas de mídia (Meta Ads, Google Ads, Google Analytics) por cliente.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Replit built-in) via Prisma ORM
- **Styling**: Tailwind CSS + Radix UI
- **Charts**: Recharts
- **APIs**: Google Ads, Meta Marketing API, Google Analytics 4, Google Sheets

## Project Structure
```
app/          - Next.js App Router pages and API routes
components/   - Reusable UI components
config/       - Configuration files
lib/          - Utility functions and Prisma client
  generated/  - Prisma generated client
prisma/       - Database schema and migrations
scripts/      - Data import/sync scripts
docs/         - Project documentation
public/       - Static assets
```

## Running the App
The app runs on port 5000 with `npm run dev`.

## Database
Uses Replit's built-in PostgreSQL. Schema managed via Prisma.
- Run `npm run db:push` to sync schema changes
- Run `npm run db:generate` to regenerate Prisma client
- Run `npm run db:studio` to open Prisma Studio

## Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Replit)
- `META_ACCESS_TOKEN` - Meta Marketing API token
- `META_AD_ACCOUNT_ID` - Meta ad account ID
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Google Ads developer token
- `GOOGLE_ADS_CLIENT_ID` - Google Ads OAuth client ID
- `GOOGLE_ADS_CLIENT_SECRET` - Google Ads OAuth client secret
- `GOOGLE_ADS_REFRESH_TOKEN` - Google Ads OAuth refresh token
- `GOOGLE_ANALYTICS_CREDENTIALS` - GA4 service account JSON string
- `GOOGLE_CLIENT_EMAIL` - Google Sheets service account email
- `GOOGLE_PRIVATE_KEY` - Google Sheets service account private key
- `SYNC_CRON_TOKEN` - Token for protecting sync endpoints
- `ADMIN_SECRET` - Token for admin area protection
