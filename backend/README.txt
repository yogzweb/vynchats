BACKEND
1. Salin .env.example menjadi .env.
2. Isi DATABASE_URL dengan URL PostgreSQL dan JWT_SECRET dengan rahasia acak panjang.
3. Di terminal dalam folder backend:
   npm install
   npm run db:init
   npm start
4. Buka http://localhost:3000/health. Ini hanya menguji server lokal; chat antar-HP memerlukan URL HTTPS online.
