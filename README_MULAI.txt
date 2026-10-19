VYNCHAT BARU — PAKET AWAL
========================
Tujuan: aplikasi chat Android, dengan login dan pesan real-time.
Penting: paket ini adalah proyek sumber, bukan APK jadi. Agar HP berbeda bisa saling chat lewat internet, backend dan database harus di-deploy ke server online.

STRUKTUR
- backend/  : API, login, database PostgreSQL, Socket.IO
- mobile/   : aplikasi Android Expo

LANGKAH DI LAPTOP WINDOWS
1. Ekstrak ZIP ke folder yang mudah ditemukan, misalnya C:\VynChat_Baru
2. Pasang Node.js LTS dari https://nodejs.org jika belum ada.
3. Siapkan PostgreSQL lokal atau database PostgreSQL online.
4. Buka folder VynChat_Baru di VS Code.
5. Ikuti README di backend dan mobile.

JANGAN unggah file .env, password, JWT secret, atau token ke repositori publik.

FITUR DI VERSI AWAL
- Daftar akun dan login
- Daftar pengguna
- Chat pribadi real-time
- Riwayat pesan tersimpan di database
- Tampilan gelap Purple Neon
- Struktur awal yang bisa dikembangkan untuk foto, grup, status, panggilan, dan fitur lain

FITUR lanjutan seperti panggilan suara/video, status 24 jam, kirim file, enkripsi end-to-end, dan notifikasi push belum aktif di paket awal.
