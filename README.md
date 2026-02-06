# eSummit CGC Mohali - Backend API

Backend API for eSummit CGC Mohali event management system. Built with Node.js, Express, Supabase, and Razorpay.

## 🚀 Quick Start

### Local Development

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Test health endpoint**
   ```bash
   curl http://localhost:3000/api/health
   ```

## 📋 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Profile
- `GET /api/profile` - Get user profile (auth required)
- `PUT /api/profile` - Update user profile (auth required)

### Events
- `GET /api/events` - List all active events
- `GET /api/events/:id` - Get event details with countdown

### Passes
- `GET /api/passes` - List all passes
- `POST /api/passes/:id/buy` - Purchase a pass (auth required)

### Orders
- `GET /api/orders` - Get user's orders (auth required)

### Dashboard
- `GET /api/dashboard` - Get user dashboard data (auth required)

### Webhooks
- `POST /api/webhook/razorpay` - Razorpay payment webhook

### Cron
- `POST /api/cron/ping` - Daily ping to keep Supabase active

## 🔧 Environment Variables

See `.env.example` for all required variables.

## 📦 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set Root Directory to `backend`
4. Add environment variables
5. Deploy!

## 🧪 Testing

```bash
npm test
```

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [API Documentation](./API_DOCS.md) (coming soon)

## 🛠️ Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Razorpay
- **Realtime**: Socket.io
- **Hosting**: Vercel

## 📝 License

MIT
