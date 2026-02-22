Multi‑tenant SaaS app with auth, billing, RBAC, audit logs, and admin dashboard
Deployed On: * http://considerate-bravery-production-e198.up.railway.app *

# Rv5 — Project Management Platform
Rv5 is a full-stack, multi-tenant project management system with:
- Auth (signup/login)
- RBAC (owner/admin/member/viewer)
- Audit logs
- Projects, boards, and tasks
- Project-level member assignments

## Stack
- Server: Node + Express + Prisma + SQLite (default)
- Web: React + Vite

## Quick Start (Terminal)
1. Go to the project:
```
cd "/Users////saas-project"
```

2. Install dependencies:
```
npm install
```

3. Create the database and generate Prisma client:
```
npm run prisma:generate --workspace apps/server
npm run prisma:migrate --workspace apps/server
```
When prompted for a migration name, type:
```
init
```

4. Run the app:
```
npm run dev
```

Server: http://localhost:5555  
Web: http://localhost:5173

## Environment
Copy the example file:
```
cp "apps/server/.env.example" "apps/server/.env"
```

Default values (SQLite):
```
PORT=5555
JWT_SECRET=super-secret
```

## Database Location (SQLite)
```
apps/server/prisma/dev.db
```

## Reset All Data
```
rm -f apps/server/prisma/dev.db
npm run prisma:migrate --workspace apps/server
```

## Notes
- If you want Postgres later, update `apps/server/prisma/schema.prisma` and `DATABASE_URL`.
- Billing endpoints require Stripe keys (optional).

// cd "/Users/gaurishankarvhadle/Documents/New project/saas-project"
rm -f apps/server/prisma/dev.db
npm run prisma:migrate --workspace apps/server
npm run dev

// /Users/gaurishankarvhadle/Documents/New project/saas-project/apps/server/prisma/dev.db
Where all data is stored
Your data lives in this SQLite file:

/Users/gaurishankarvhadle/Documents/New project/saas-project/apps/server/prisma/dev.db
Ways to view all data
Option 1: Prisma Studio (easy UI)
cd "/Users/gaurishankarvhadle/Documents/New project/saas-project"
npx prisma studio --schema apps/server/prisma/schema.prisma
This opens a web UI where you can browse everything.

Option 2: Terminal (SQLite)
sqlite3 "/Users/gaurishankarvhadle/Documents/New project/saas-project/apps/server/prisma/dev.db"
.tables
SELECT * FROM User;
SELECT * FROM Project;
Changes made

Server default port is now 5555
Web app calls API at http://localhost:5555
README includes full terminal steps + DB location + reset steps
.env.example includes PORT=5555
