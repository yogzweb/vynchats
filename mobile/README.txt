MOBILE
1. Pasang Node.js LTS.
2. Buka terminal di folder mobile lalu jalankan:
   npm install
   npx expo start
3. Untuk APK, akun Expo/EAS diperlukan. Setelah backend online:
   - Ganti API_URL di src/config.js dengan URL HTTPS backend.
   - Atur projectId EAS di app.json.
   - Jalankan npx eas-cli@latest login
   - Jalankan npx eas-cli@latest build:configure
   - Jalankan npx eas-cli@latest build -p android --profile preview
Catatan: jangan membangun APK sebelum API_URL diarahkan ke backend online.
