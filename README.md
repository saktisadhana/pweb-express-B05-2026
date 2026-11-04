# MLBB Shop

Praktikum Pemrograman Web Modul 4, kelompok B05.

Bagian Sakti: setup project, middleware, dan fitur Hero. Endpoint Skin, Player, top up, match, pembelian hero, dan statistik belum dikerjakan di sini.

Stack: Express 5, TypeScript, Prisma 7, dan PostgreSQL Neon. Tugas ini tidak memakai login/JWT.

## Menjalankan

Gunakan Node.js 24 atau lebih baru. Jalankan dari folder repo:

```sh
npm ci
```

Salin `.env.example` menjadi `.env`, lalu isi dari menu Connect di Neon:

- `DATABASE_URL`: connection string pooled, untuk aplikasi dan seed.
- `DATABASE_URL_UNPOOLED`: connection string direct, untuk migrasi.
- `PORT`: default `3000`.

Jangan commit `.env`. Gunakan connection string Neon yang menyertakan `sslmode=require`.

```sh
npm run db:migrate
npm run db:generate
npm run db:seed
npm run dev
```

Seed menghapus data di keempat tabel dan mereset ID. Jalankan hanya di database latihan, dan koordinasikan dulu kalau database dipakai bersama.

Buka `http://localhost:3000/health` untuk mengecek koneksi database. Server hanya menerima koneksi lokal. `npm start` tersedia kalau tidak perlu watcher; `npm run db:studio` untuk melihat data.

Koneksi Neon belum diuji karena kredensial belum tersedia. Migrasi dan seed perlu dijalankan setelah `.env` diisi.

## Database

Schema ada di `prisma/schema.prisma`, mengikuti gambar pada soal:

- `Hero` dan `Skin` untuk katalog. Nama hero unik; harga bisa `null`.
- `Player` dengan nickname unik, saldo awal 10000 BP dan 0 Diamond.
- `PlayerHero` menyimpan kepemilikan, currency, dan harga saat dibeli. Pasangan playerId dan heroId harus unik.

Relasi Skin ke Hero dan PlayerHero ke Player memakai cascade. Enum yang dipakai: `Role`, `Lane`, `Rarity`, dan `Currency`.

Seed mengisi 133 hero, 892 skin, 3 player, dan 4 kepemilikan sesuai soal. File resmi ternyata berupa CSV; catatan konversinya ada di [data/README.md](data/README.md). Jangan mengubah urutan hero karena ID skin dan kepemilikan mengacu ke urutan tersebut.

## Endpoint

| Method | URL | Keterangan |
| --- | --- | --- |
| GET | `/health` | Cek server dan database |
| GET | `/api/heroes` | Daftar hero |
| GET | `/api/heroes/:hero_id` | Detail hero beserta skin |
| POST | `/api/heroes` | Tambah hero |

Contoh filter:

```http
GET /api/heroes?page=1&limit=5&role=MARKSMAN&search=la
```

Default page 1 dan limit 10, maksimal 100. Search tidak membedakan huruf besar/kecil. Daftar hero menyertakan metadata pagination; filter pada data dan totalnya sama.

Body untuk menambah hero:

```json
{
  "name": "Collie",
  "role": "MAGE",
  "lane": "MID",
  "releaseYear": 2026,
  "priceBP": 32000,
  "priceDiamond": 599
}
```

Field wajib dicek lebih dulu, lalu nama duplikat. Input tidak valid mendapat 400, nama duplikat 409, dan hero berhasil dibuat 201. Harga yang tidak dikirim disimpan sebagai `null`, bukan nol. Hero yang tidak ditemukan mendapat 404.

Logger mencatat method, path, status, dan durasi. Error memakai format `{ "status": false, "message": "..." }`, termasuk URL yang tidak terdaftar. Response sukses memakai `status`, `message`, dan data jika ada.

## Pengujian

```sh
npm run typecheck
npm run db:validate
npm test
npm run test:coverage
```

Test otomatis memakai mock Prisma, jadi tidak menyentuh Neon. Test ini memeriksa endpoint Hero, middleware, dataset, dan urutan seed. Untuk mengecek database sungguhan, jalankan seed dan Postman setelah koneksi siap.

Koleksi Postman:

- [Bagian Sakti](postman/Sakti-Setup-Middleware-Hero.postman_collection.json): testcase 01–08 dan 28, dengan assertion.
- [Koleksi resmi](postman/MLBB-Shop-official.postman_collection.json): seluruh 28 testcase dari soal.

Jalankan seed ulang sebelum mencoba urutan testcase. Hasil acuan: 20 Marksman, 10 hero yang namanya mengandung `la`, Layla ID 18 dengan 11 skin, dan Collie mendapat ID 134 setelah ditambahkan. Request tambah Collie berikutnya akan mendapat 409.

Router anggota lain bisa dipasang di `src/routes/index.ts`. Gunakan instance Prisma di `src/config/prisma.ts` dan helper response di `src/utils/response.ts` yang sama.
