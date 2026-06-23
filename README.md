# Plateforme de Gestion et Réservation de Salles

API REST backend pour la gestion et réservation de salles de réunion.

---

## Stack technique

| Technologie | Version |
|---|---|
| Node.js | 20.19.1 |
| npm | 10.8.2 |
| NestJS | 11.x |
| TypeScript | 5.7.x |
| PostgreSQL | 14+ |
| Prisma ORM | 7.8.0 |
| Jest | 30.x |

---

## Prérequis

- [Node.js v20+](https://nodejs.org/)
- [PostgreSQL 14+](https://www.postgresql.org/)
- Git

---

## Installation

### 1. Cloner le projet

```bash
git clone git@gitlab.com:endtoend3/reservation-salle-reunion.git
cd reservation-salle-reunion
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Modifier `.env` avec vos valeurs :

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/reservation_db

JWT_ACCESS_SECRET=your_access_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d
```

### 4. Générer le client Prisma

```bash
npx prisma generate
```

### 5. Créer la base de données et appliquer les migrations

```bash
npx prisma migrate dev
```

### 6. Initialiser les données de base (rôles, permissions, admin)

```bash
npm run seed
```

Credentials admin par défaut :
- Email : `admin@reservation.com`
- Mot de passe : `Admin@1234`

---

## Lancer l'application

```bash
# Développement (hot reload)
npm run start:dev

# Production
npm run build
npm run start:prod
```

L'API est disponible sur : `http://localhost:3000/api/v1`

---

## Documentation API (Swagger)

Accessible après démarrage :

```
http://localhost:3000/api/v1/docs
```

Le jury peut tester directement : Login, Réservations, Salles.

---

## Collection Postman

Un fichier d'import Postman est disponible à la racine :

```
reservation-api.postman_collection.json
```

Importer via : `Postman → File → Import`

Les tokens sont stockés automatiquement après le login.

---

## Commandes utiles

```bash
# Linter
npm run lint

# Tests unitaires
npm run test

# Couverture de tests
npm run test:cov

# Build
npm run build

# Seed (initialisation des données)
npm run seed

# Prisma Studio (interface visuelle DB)
npx prisma studio
```

---

## Architecture du projet

```
src/
├── common/
│   ├── concurrency/        # Mutex applicatif (anti race condition)
│   ├── decorators/         # @CurrentUser, @Roles, AppRole enum
│   ├── filters/            # GlobalExceptionFilter
│   ├── guards/             # JwtAccessGuard, JwtRefreshGuard, RolesGuard
│   └── interceptors/       # ResponseInterceptor
├── config/                 # app.config, jwt.config
├── prisma/                 # PrismaService, PrismaModule
└── modules/
    ├── auth/               # Login, Refresh Token, Logout
    ├── users/              # CRUD utilisateurs
    ├── roles/              # CRUD rôles et permissions (RBAC)
    ├── rooms/              # CRUD salles
    ├── reservations/       # Réservations (toutes les règles métier)
    └── audit/              # Journalisation des actions
```

---

## Règles métier implémentées

| Règle | Description |
|---|---|
| RG-01 | Délai minimal de 1h avant la réservation |
| RG-02 | Salle disponible pendant toute la période |
| RG-03 | Aucun chevauchement de réservations |
| RG-04 | Motif obligatoire |
| RG-05 | Seul l'auteur ou un admin peut modifier |
| RG-06 | Re-vérification complète à chaque modification |
| RG-07 | Seul l'auteur ou un admin peut annuler |
| RG-08 | Traçabilité complète des annulations |
| RG-09 | Soft delete — pas de suppression physique |
| RG-10 | Contrôle d'accès RBAC sur toutes les opérations |

---

## Gestion de la concurrence

Double protection contre les race conditions :

- **Mutex applicatif** par `roomId` — protège sur la même instance Node.js
- **Transaction Serializable** Prisma — protège entre instances multiples

---

## Rôles et permissions

| Rôle | Accès |
|---|---|
| `ADMIN` | Accès total |
| `MANAGER` | Gestion salles + validation/refus réservations |
| `USER` | Consulter, créer, annuler ses propres réservations |

---

## CI/CD (GitLab)

Pipeline automatique à chaque push :

```
install → lint → test → build
```

Rapport de couverture disponible dans **GitLab → CI/CD → Pipelines**.

---

## Branches Git

| Branche | Usage |
|---|---|
| `main` | Production |
| `develop` | Intégration |
| `feature/xxx` | Nouvelle fonctionnalité |
| `fix/xxx` | Correction de bug |
| `hotfix/xxx` | Correction urgente production |
