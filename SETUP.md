# Spotted City - Backend API

RESTful API dla aplikacji społecznościowo-mapowej do lokalnych zgłoszeń, ogłoszeń i wydarzeń miejskich.

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL + PostGIS
- **ORM**: Prisma
- **Authentication**: JWT + Passport
- **Storage**: Supabase Storage
- **File Upload**: Multer
- **Validation**: Class Validator

## Wymagania

- Node.js >= 18
- npm / yarn
- PostgreSQL >= 13
- Supabase Account (dla storage)
- Google OAuth credentials (opcjonalnie)

## Instalacja

### 1. Klonowanie repozytorium

```bash
git clone <repo-url>
cd spotted-backend
```

### 2. Instalacja zależności

```bash
npm install
```

### 3. Konfiguracja zmiennych środowiska

```bash
cp .env.example .env
```

Edytuj `.env` i ustaw wartości:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/spotted_db"
JWT_SECRET="your-super-secret-jwt-key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-key"
```

### 4. Generowanie Prisma Client

```bash
npm run prisma:generate
```

### 5. Migracja bazy danych

```bash
npm run prisma:migrate
```

### 6. Seedowanie danych (miasta i kategorie)

```bash
npm run db:seed
```

## Uruchomienie

### Development

```bash
npm run start:dev
```

API będzie dostępny na: `http://localhost:3000`

### Production

```bash
npm run build
npm run start:prod
```

## Dostępne Endpointy

### Authentication
- `POST /auth/signup` - Rejestracja użytkownika
- `POST /auth/signin` - Logowanie emailem
- `POST /auth/google` - Logowanie przez Google

### Users
- `GET /users/:id` - Profil użytkownika
- `PUT /users/:id` - Aktualizacja profilu
- `GET /users/:id/reputation` - Reputacja użytkownika
- `GET /users/:id/posts` - Posty użytkownika

### Posts
- `POST /posts` - Tworzenie postu
- `GET /posts/:id` - Post szczegóły
- `PUT /posts/:id` - Edycja postu
- `DELETE /posts/:id` - Usunięcie postu
- `GET /posts/city/:cityId` - Posty w mieście
- `GET /posts/nearby?latitude=x&longitude=y&radius=5` - Posty w pobliżu

### Categories
- `GET /categories` - Lista kategorii
- `GET /categories/:slug` - Kategoria szczegóły
- `POST /categories` - Tworzenie kategorii

### Cities
- `GET /cities` - Lista miast
- `GET /cities/:id` - Miasto szczegóły
- `GET /cities/voivodeship/:voivodeship` - Miasta w województwie
- `POST /cities` - Tworzenie miasta

### Comments
- `POST /comments` - Dodanie komentarza
- `GET /comments/post/:postId` - Komentarze postu
- `PUT /comments/:id` - Edycja komentarza
- `DELETE /comments/:id` - Usunięcie komentarza

### Votes
- `POST /votes/post/:postId` - Głosowanie na post
- `POST /votes/comment/:commentId` - Głosowanie na komentarz

### Flags (Reports)
- `POST /flags` - Zgłoszenie nieodpowiedniej treści
- `GET /flags` - Lista zgłoszeń (admin)
- `GET /flags/post/:postId` - Zgłoszenia postu
- `PATCH /flags/:id` - Rozpatrzenie zgłoszenia

### Subscriptions
- `POST /subscriptions` - Subskrybowanie postu/kategorii
- `GET /subscriptions` - Moje subskrypcje
- `DELETE /subscriptions/:id` - Rezygnacja z subskrypcji

### Uploads
- `POST /uploads/image` - Upload zdjęcia
- `POST /uploads/images` - Upload wielu zdjęć
- `POST /uploads/avatar` - Upload awatara

## Struktura projektu

```
src/
├── auth/              # Autentykacja (JWT, OAuth)
├── users/             # Profil użytkownika
├── posts/             # Posty/zgłoszenia
├── comments/          # Komentarze
├── categories/        # Kategorie
├── cities/            # Miasta i województwa
├── votes/             # Głosowanie
├── flags/             # Zgłaszanie treści
├── subscriptions/     # Subskrypcje
├── uploads/           # Upload plików
├── prisma/            # Prisma ORM
├── config/            # Konfiguracja
└── main.ts            # Entry point
```

## Baza danych

### Modele Prisma
- **User** - Użytkownik aplikacji
- **Post** - Główny post/zgłoszenie
- **Comment** - Komentarz do postu
- **Vote** - Głos na post/komentarz
- **Category** - Kategoria postu
- **City** - Miasto/lokalizacja
- **UserReputation** - Reputacja użytkownika
- **Flag** - Zgłoszenie nieodpowiedniej treści
- **Subscription** - Subskrypcja postu/kategorii

## Bezpieczeństwo

- JWT tokens dla autentykacji
- Hasła hasłowane bcrypt
- CORS włączony dla frontendu
- Walidacja DTO dla wszystkich request body
- Role-based access control (RBAC) - do implementacji

## TODO

- [ ] FCM integracja dla notyfikacji push
- [ ] PostGIS queries dla lepszych wyszukiwań geolokacyjnych
- [ ] Rate limiting
- [ ] Image optimization i compression
- [ ] Webhook support dla zmian
- [ ] GraphQL API endpoint
- [ ] Caching (Redis)
- [ ] Admin dashboard
- [ ] Analytics

## Kontrybuowanie

1. Forkuj repozytorium
2. Stwórz branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit zmiany (`git commit -m 'Add some AmazingFeature'`)
4. Push branch (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

## Licencja

UNLICENSED
