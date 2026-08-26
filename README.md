# CloudNotes

A lightweight, secure Notes Management web app built with Node.js, Express, EJS, and MySQL.

> **Note on scope:** CloudNotes is a **demo workload**, not the main project. It exists to
> give a real, stateful, database-backed application to deploy on AWS infrastructure built
> with **Terraform, Ansible, Docker, an Application Load Balancer, an Auto Scaling Group,
> Amazon RDS, and CloudWatch**. The app itself is intentionally simple — the infrastructure
> around it is the point.

---

## Project Overview

CloudNotes lets a person register an account, log in, and keep private text notes — create,
read, edit, and delete. Each note shows when it was created and when it was last updated.
Every note belongs to exactly one user, and a user can never see, edit, or delete anyone
else's notes.

**Why it's built this way** — a couple of choices exist specifically to behave correctly once
this app is running behind an ALB with more than one instance in an Auto Scaling Group:

- **Sessions are stored in MySQL, not in server memory** (via `express-mysql-session`). With
  the default in-memory session store, a user logged into instance A would appear logged out
  the moment the ALB routed their next request to instance B. Storing sessions in the same
  RDS database every instance already talks to solves this without adding Redis or any new
  infrastructure.
- **`GET /health`** is a small, unauthenticated endpoint that checks the database connection
  and returns `200`/`503`. Point the ALB target group's health check at it so Auto Scaling
  replaces an instance that has lost its connection to RDS — not just one whose Node process
  happens to still be running.
- **The app retries its database connection on startup** (up to 15 times, 2s apart) instead of
  crashing immediately. This absorbs the few seconds it can take a fresh container or EC2
  instance to come up before RDS/the `db` container is reachable.
- **Access logs go to stdout** (via `morgan`), which is exactly where the CloudWatch agent
  (or an ECS/EC2 log driver) expects to read them from.

---

## Features

- **Registration** — name, unique User ID, password (hashed with bcrypt, never stored in plain text)
- **Login / Logout** — session-based authentication
- **Dashboard** — "Welcome, `<Name>`", a **New Note** button, and a grid of the user's own notes
- **Notes** — create, view, edit, and delete; each shows its created and last-updated timestamps
- **Security** — parameterized SQL queries, per-user access control on every note query, hashed passwords, HTML-escaped note content

---

## Tech Stack

| Layer          | Choice                                   |
|----------------|-------------------------------------------|
| Backend        | Node.js, Express 5                        |
| Frontend       | EJS, Bootstrap 5, Bootstrap Icons, vanilla CSS/JS |
| Database       | MySQL 8                                   |
| Auth           | express-session (MySQL-backed) + bcrypt   |
| Containers     | Docker, Docker Compose                    |

---

## Folder Structure

```text
cloudnotes/
│── app.js                 # Entry point: middleware, sessions, routes, startup
│── package.json
│── package-lock.json
│── Dockerfile              # Multi-stage build
│── docker-compose.yml
│── .dockerignore
│── .env                    # Local/demo defaults — replace for real deployments
│── .gitignore
│── README.md
│
├── public/
│   ├── css/style.css       # Blue & white theme
│   ├── js/script.js        # Delete confirmation, alert auto-dismiss
│   └── images/
│
├── views/
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   └── edit-note.ejs
│
├── routes/
│   ├── auth.js             # Register, login, logout
│   └── notes.js            # Dashboard + note CRUD
│
├── database/
│   ├── db.js                # MySQL connection pool
│   └── schema.sql           # Table definitions
│
└── middleware/
    └── auth.js              # Protects logged-in-only routes
```

---

## Environment Variables

All variables live in `.env`. The committed file already has working defaults for local
development and `docker compose up` — **change every value before deploying anywhere real.**

| Variable          | Purpose                                                                 | Local default            |
|--------------------|--------------------------------------------------------------------------|---------------------------|
| `PORT`             | Port the app listens on                                                  | `3000`                    |
| `SESSION_SECRET`   | Signs the session cookie — must be long, random, and kept secret         | *(placeholder — change)*  |
| `DB_HOST`          | MySQL host. `localhost` for `npm start`; Compose overrides this to `db`  | `localhost`                |
| `DB_PORT`          | MySQL port                                                                | `3306`                     |
| `DB_NAME`          | Database name                                                             | `cloudnotes`               |
| `DB_USER`          | Application's MySQL user                                                 | `cloudnotes_user`          |
| `DB_PASSWORD`      | That user's password                                                      | `cloudnotes_password`      |
| `DB_ROOT_PASSWORD` | Root password used only by the `db` service in Docker Compose             | `cloudnotes_root_password` |

To generate a real session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

**If you're using Docker Compose, skip this — the `db` container runs `database/schema.sql`
automatically the first time it starts.**

To set it up manually against your own MySQL server:

```sql
CREATE DATABASE IF NOT EXISTS cloudnotes;
CREATE USER IF NOT EXISTS 'cloudnotes_user'@'localhost' IDENTIFIED BY 'cloudnotes_password';
GRANT ALL PRIVILEGES ON cloudnotes.* TO 'cloudnotes_user'@'localhost';
FLUSH PRIVILEGES;
```

Then load the schema:

```bash
mysql -u root -p cloudnotes < database/schema.sql
```

This creates two tables — `users` and `notes` — with `notes.user_id` as a foreign key to
`users.id` (`ON DELETE CASCADE`). The `sessions` table used for login state is created
automatically by the app the first time it starts.

---

## Installation & Commands to Run Locally

Requires Node.js 18+ and a MySQL server.

```bash
# 1. Install dependencies
npm install

# 2. Set up the database (see "Database Setup" above)

# 3. Copy/edit .env — for a non-Docker run, make sure DB_HOST=localhost

# 4. Start the app
npm start
```

Visit **http://localhost:3000** — you'll land on the login page and can register a new account
from there.

---

## Commands to Run Using Docker

Requires Docker and Docker Compose. No local Node.js or MySQL install needed.

```bash
# Build the images and start both containers
docker compose up --build

# Or run it in the background
docker compose up --build -d

# View logs
docker compose logs -f app

# Stop everything
docker compose down

# Stop everything AND delete the database volume (fresh start)
docker compose down -v
```

Once both containers report healthy, visit **http://localhost:3000**.

The `app` service builds from the included `Dockerfile`, which uses a two-stage build:
the first stage installs dependencies (bcrypt needs a native module compiled, which needs
build tools); the second stage copies in only the compiled `node_modules` and app code, so
the final image doesn't carry any build tools, and runs as a non-root user.

---

## Security Notes

- Passwords are hashed with **bcrypt** (10 salt rounds) — plaintext passwords are never stored or logged.
- All database queries use **parameterized placeholders** (`?`), never string-concatenated SQL.
- Every note route is protected by session-based auth **and** every query is scoped with
  `AND user_id = ?`, so a user can't read, edit, or delete another user's note — even by
  guessing its ID directly in the URL.
- Note content is rendered with EJS's auto-escaping (`<%= %>`), so a note containing HTML or
  a `<script>` tag is displayed as plain text, not executed.
- Session cookies are `httpOnly` and `sameSite: lax`.

---

## What Was Intentionally Left Out

Per the brief, this app deliberately does **not** include: email verification, OTP, forgot
password, profile pictures, dark mode, a rich text editor, file/image/PDF upload, categories,
tags, sharing, comments, notifications, an admin panel, user roles, search, or
favorite/pinned notes. It's meant to stay a small, easy-to-reason-about workload for
exercising the infrastructure around it.
