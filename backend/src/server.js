import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { Server } from 'socket.io';

const { Pool } = pg;
const PORT = Number(process.env.PORT || 3000);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diisi.');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) throw new Error('JWT_SECRET harus diisi dengan rahasia acak minimal 24 karakter.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false }
});
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

function makeToken(user) {
  return jwt.sign({ id: String(user.id), username: user.username }, process.env.JWT_SECRET, { expiresIn: '14d' });
}
async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Sesi tidak valid. Silakan login lagi.' }); }
}
app.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ server: 'online', database: 'connected' }); }
  catch { res.status(503).json({ server: 'online', database: 'disconnected' }); }
});
app.post('/api/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || username).trim().slice(0, 50);
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: 'Username 3–24 karakter: huruf kecil, angka, garis bawah.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    const hash = await bcrypt.hash(password, 12);
    const q = await pool.query(
      'INSERT INTO users(username,password_hash,display_name) VALUES($1,$2,$3) RETURNING id,username,display_name',
      [username, hash, displayName || username]
    );
    const user = q.rows[0];
    res.status(201).json({ token: makeToken(user), user: { id: String(user.id), username: user.username, displayName: user.display_name } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Username sudah dipakai.' });
    console.error(e); res.status(500).json({ error: 'Pendaftaran gagal. Periksa server dan database.' });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const q = await pool.query('SELECT id,username,display_name,password_hash FROM users WHERE username=$1', [username]);
    const u = q.rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'Username atau password salah.' });
    res.json({ token: makeToken(u), user: { id: String(u.id), username: u.username, displayName: u.display_name } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Login gagal.' }); }
});
app.get('/api/users', auth, async (req, res) => {
  try {
    const q = await pool.query(
      'SELECT id,username,display_name FROM users WHERE id <> $1 ORDER BY display_name LIMIT 200',
      [req.user.id]
    );
    res.json({ users: q.rows.map(u => ({ id: String(u.id), username: u.username, displayName: u.display_name })) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Gagal memuat pengguna.' }); }
});
app.get('/api/messages/:otherId', auth, async (req, res) => {
  try {
    const other = String(req.params.otherId);
    if (!/^\d+$/.test(other)) return res.status(400).json({ error: 'ID pengguna tidak valid.' });
    const q = await pool.query(
      `SELECT id,sender_id,receiver_id,body,created_at
       FROM messages
       WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.id, other]
    );
    res.json({ messages: q.rows.reverse().map(formatMessage) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Gagal memuat pesan.' }); }
});
function formatMessage(m) {
  return { id: String(m.id), senderId: String(m.sender_id), receiverId: String(m.receiver_id), body: m.body, createdAt: m.created_at };
}
io.use((socket, next) => {
  try { socket.user = jwt.verify(socket.handshake.auth?.token || '', process.env.JWT_SECRET); next(); }
  catch { next(new Error('Sesi tidak valid')); }
});
io.on('connection', socket => {
  socket.join(`user:${socket.user.id}`);
  socket.on('message:send', async (data, ack) => {
    try {
      const receiverId = String(data?.receiverId || '');
      const body = String(data?.body || '').trim();
      if (!/^\d+$/.test(receiverId) || receiverId === String(socket.user.id)) throw new Error('Penerima tidak valid.');
      if (!body || body.length > 4000) throw new Error('Pesan harus 1–4000 karakter.');
      const exists = await pool.query('SELECT id FROM users WHERE id=$1', [receiverId]);
      if (!exists.rowCount) throw new Error('Pengguna tidak ditemukan.');
      const q = await pool.query(
        'INSERT INTO messages(sender_id,receiver_id,body) VALUES($1,$2,$3) RETURNING id,sender_id,receiver_id,body,created_at',
        [socket.user.id, receiverId, body]
      );
      const message = formatMessage(q.rows[0]);
      io.to(`user:${receiverId}`).emit('message:new', message);
      socket.emit('message:new', message);
      if (typeof ack === 'function') ack({ ok: true, message });
    } catch (e) {
      if (typeof ack === 'function') ack({ ok: false, error: e.message || 'Pesan gagal dikirim.' });
    }
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`VynChat API berjalan di port ${PORT}`));
