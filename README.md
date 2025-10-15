# Garuda Game Forum API

API Back-End untuk platform diskusi pemain Garuda Game. Proyek ini menerapkan Clean Architecture, otomatisasi testing (unit + integrasi), serta PostgreSQL.

## Status Fitur (sesuai kriteria)

- [x] Registrasi Pengguna: POST /users
- [x] Login, Refresh, Logout: POST/PUT/DELETE /authentications
- [x] Menambahkan Thread: POST /threads
- [x] Melihat Detail Thread: GET /threads/{threadId} (berisi komentar dan balasan)
- [x] Menambahkan Komentar pada Thread: POST /threads/{threadId}/comments
- [x] Menghapus Komentar pada Thread: DELETE /threads/{threadId}/comments/{commentId}
- [x] (Opsional) Menambahkan Balasan Komentar: POST /threads/{threadId}/comments/{commentId}/replies
- [x] (Opsional) Menghapus Balasan Komentar: DELETE /threads/{threadId}/comments/{commentId}/replies/{replyId}

> Catatan: Modul Users dan Auth sudah tersedia beserta test. Modul Threads/Comments/Replies belum diimplementasikan.

## Arsitektur (Clean Architecture)

Struktur direktori utama:
- `src/Domains/*`: Abstraksi domain, entitas, dan kontrak repository
- `src/Applications/use_case/*`: Orkestrasi bisnis (use case), tanpa ketergantungan framework
- `src/Interfaces/http/*`: Handler, routes, validasi request/response
- `src/Infrastructures/*`: Implementasi konkret (Postgres, JWT, Hapi server, DI container)
- `src/Commons/*`: Error handling dan utilitas bersama
- `tests/*`: Test helper untuk integrasi database

Dependency flow: Interfaces → Applications → Domains (satu arah, tidak memutar balik).

## Prasyarat

- Node.js 14+ dan PostgreSQL 12+
- Database untuk development dan test (gunakan env var di bawah)

## Variabel Lingkungan

Wajib:
- Server
  - `HOST` (mis. `localhost`)
  - `PORT` (mis. `4000`)
- Auth
  - `ACCESS_TOKEN_KEY` (string rahasia untuk access token JWT)
  - `REFRESH_TOKEN_KEY` (string rahasia untuk refresh token JWT)
- PostgreSQL (mode test)
  - `PGHOST_TEST`
  - `PGPORT_TEST`
  - `PGUSER_TEST`
  - `PGPASSWORD_TEST`
  - `PGDATABASE_TEST`

File `.env` dibaca otomatis oleh `src/app.js` via `dotenv`.

## Skrip NPM

- Jalankan dev: `npm run start:dev`
- Jalankan produksi: `npm start`
- Test (unit+integrasi): `npm test`
- Test watch (perubahan file): `npm run test:watch:change`
- Test watch all + coverage: `npm run test:watch`
- Migrasi DB: 
  - Dev: `npm run migrate`
  - Test: `npm run migrate:test` (menggunakan `config/database/test.json`)

## Menjalankan Proyek

1) Isi `.env` dengan nilai yang sesuai (lihat daftar variabel di atas)  
2) Jalankan migrasi DB (dev/test sesuai kebutuhan)  
3) Start server: `npm run start:dev` → server berjalan di `http://HOST:PORT`

## API yang Sudah Tersedia

- Registrasi Pengguna
  - POST `/users`
  - Body: `{ "username": "...", "password": "...", "fullname": "..." }`
  - Respon sukses: `{ "status": "success", "data": { "addedUser": { id, username, fullname } } }`

- Autentikasi
  - POST `/authentications` (login)  
    Body: `{ "username": "...", "password": "..." }`  
    Respon: `{ "status": "success", "data": { "accessToken", "refreshToken" } }`
  - PUT `/authentications` (refresh access token)  
    Body: `{ "refreshToken": "..." }`  
    Respon: `{ "status": "success", "data": { "accessToken" } }`
  - DELETE `/authentications` (logout)  
    Body: `{ "refreshToken": "..." }`  
    Respon: `{ "status": "success" }`

## API yang Akan Ditambahkan

Mengacu kriteria yang Anda lampirkan (ringkas):
- Threads
  - POST `/threads` (restrict: butuh access token)
  - GET `/threads/{threadId}` (public): menampilkan detail thread, komentar beserta balasan, urut kronologis, masking konten terhapus
- Comments
  - POST `/threads/{threadId}/comments` (restrict)
  - DELETE `/threads/{threadId}/comments/{commentId}` (restrict, pemilik)
- Replies (opsional)
  - POST `/threads/{threadId}/comments/{commentId}/replies` (restrict)
  - DELETE `/threads/{threadId}/comments/{commentId}/replies/{replyId}` (restrict, pemilik)

## Testing

- Unit test untuk entitas dan use case
- Integrasi untuk endpoint (Hapi inject) dan repository (Postgres + Test Helpers)
- Jalankan dengan `npm test` (dotenv di-setup otomatis via `--setupFiles dotenv/config`)

## Roadmap Implementasi

1) Threads
   - Domain: entitas, kontrak `ThreadRepository`
   - Infra: tabel threads + repository Postgres
   - Use case: AddThread, GetThreadDetail
   - HTTP: routes/handler + auth strategy
2) Comments
   - Domain: `CommentRepository`, entitas
   - Infra: tabel comments + repository
   - Use case: AddComment, DeleteComment (soft delete)
   - HTTP: routes/handler
3) Replies (opsional)
   - Domain + Infra + Use case Add/Delete reply (soft delete)
   - Render pada GET detail thread
4) Menambah test integrasi menyeluruh sesuai acceptance criteria

## Lisensi

ISC
