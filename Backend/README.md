# CityConnect Backend (Node.js + MongoDB)

Express.js + MongoDB backend starter for CityConnect.

## 1) Project Structure

```text
Backend/
├── config/
│   ├── database.js
│   ├── constants.js
│   └── environment.js
├── models/
├── routes/
├── controllers/
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   └── validation.js
├── utils/
│   ├── jwt.js
│   ├── password.js
│   └── validators.js
├── app.js
├── server.js
├── .env.example
├── package.json
└── README.md
```

## 2) Setup Steps

1. Go to backend folder:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from example:
   ```bash
   cp .env.example .env
   ```
   On Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```
4. Start server in dev mode:
   ```bash
   npm run dev
   ```
5. Production start:
   ```bash
   npm start
   ```

---

## 3) Local MongoDB Setup (Windows)

### A. Install MongoDB Community Server
1. Download from MongoDB official site (Community Server MSI).
2. Run installer and choose **Complete** setup.
3. Keep **Install MongoDB as a Service** checked.
4. Optional: install MongoDB Compass.

### B. Start MongoDB Service
Option 1 (Services GUI):
- Open `services.msc`
- Find `MongoDB`
- Click **Start**

Option 2 (PowerShell):
```powershell
Get-Service MongoDB
Start-Service MongoDB
Get-Service MongoDB
```

### C. Verify MongoDB is running
Use default URI:
```text
mongodb://127.0.0.1:27017
```

### D. Connect using MongoDB Compass
1. Open Compass
2. Paste URI: `mongodb://127.0.0.1:27017`
3. Click Connect

### E. Connect using MongoDB Shell (mongosh)
```bash
mongosh
```
Then:
```javascript
show dbs
use cityconnect
db.createCollection('users')
db.createCollection('shops')
db.createCollection('products')
db.createCollection('orders')
db.createCollection('coupons')
show collections
```

---

## 4) Environment Variables

Use `.env` file (refer `.env.example`):

- `PORT` - API server port (example: `5000`)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - `development` or `production`
- `CORS_ORIGIN` - Frontend URL allowed by CORS
- `API_BASE_URL` - API base URL for service-to-service calls
- `RAZORPAY_KEY_SECRET` - Razorpay signature verification key (optional for mock/local)
- `INTERNAL_ADMIN_KEY` - Shared key for internal/admin protected APIs (optional; fallback JWT secret)
- `SECURE_FIELD_KEY` - Secret used to encrypt sensitive fields like bank account numbers

---

## 5) Current Utilities Included

### JWT (`utils/jwt.js`)
- `generateToken(payload, secret)`
- `verifyToken(token, secret)`
- `decodeToken(token)`

### Password (`utils/password.js`)
- `hashPassword(password)`
- `comparePassword(password, hash)`

### Auth Middleware (`middleware/auth.js`)
- Reads Bearer token from `Authorization` header
- Verifies token using `JWT_SECRET`
- Attaches `req.user` with `id`
- Handles missing/invalid/expired token cases

---

## 6) Quick Health Check

After server starts:
- `GET /health`
- `GET /api/health`

Both should return success JSON.

---

## 7) API Documentation

- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api-docs.json`

After starting the server:

```bash
npm run dev
```

Open `http://localhost:5000/api-docs`.

---

## 8) Testing & Lint

- Run all tests:
   ```bash
   npm test
   ```
- Run unit tests only:
   ```bash
   npm run test:unit
   ```
- Run integration tests only:
   ```bash
   npm run test:integration
   ```
- Run coverage:
   ```bash
   npm run test:coverage
   ```
- Run lint:
   ```bash
   npm run lint
   ```

---

## 9) Next Recommended Steps

1. Add `User`, `Shop`, `Product`, `Order` mongoose models.
2. Build auth routes (`/api/auth/register`, `/api/auth/login`).
3. Add role-based middleware (`superadmin`, `shopkeeper`, `customer`).
4. Add centralized request validation schemas.
5. Add API versioning (`/api/v1`).
