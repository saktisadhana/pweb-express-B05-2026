# MLBB Shop

Praktikum Pemrograman Web Modul 4, kelompok B05.

Pembagian tugas:

- Sakti: setup project, middleware, dan fitur Hero.
- Al: fitur Skin, Player, dan top up.
- Marvel: fitur match, beli hero, dan statistik.

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
| POST | `/api/players/:player_id/matches` | Hadiah BP dari match |
| POST | `/api/players/:player_id/heroes` | Beli hero pakai BP atau Diamond |
| GET | `/api/statistics` | Statistik toko |

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

## Match, Beli Hero, dan Statistik (Marvel)

File: `src/controllers/matchController.ts`, `src/controllers/buyHeroController.ts`, `src/controllers/statisticController.ts`, `src/routes/player.routes.ts`, dan `src/routes/statistic.routes.ts`.

### Match

`POST /api/players/:player_id/matches` dengan body:

```json
{ "result": "WIN" }
```

Result selain `WIN` atau `LOSE` mendapat 400, player yang tidak ada mendapat 404. Jika berhasil, BP player ditambah dengan `increment` (WIN +300, LOSE +100) dan response 200 berisi `playerId`, `result`, `bpEarned`, dan `bp` terbaru.

### Beli Hero

`POST /api/players/:player_id/heroes` dengan body:

```json
{ "heroId": 22, "currency": "DIAMOND" }
```

Pemeriksaan dilakukan berurutan dan berhenti di pemeriksaan pertama yang gagal:

1. `heroId` kosong atau bukan bilangan bulat, atau `currency` bukan `BP`/`DIAMOND` → 400
2. Player tidak ditemukan → 404
3. Hero tidak ditemukan → 404
4. Harga hero untuk currency tersebut `null` → 400 (contoh: Freya tidak punya harga BP)
5. Player sudah memiliki hero tersebut → 409
6. Saldo kurang dari harga hero → 400

Pembelian disimpan dengan `prisma.$transaction([...])` berisi dua query: mengurangi saldo dengan `decrement` dan membuat data `PlayerHero`. Keduanya berhasil bersama atau batal bersama. Response 201 berisi hero yang dibeli, currency, `pricePaid`, dan saldo BP serta Diamond terbaru.

### Statistik

`GET /api/statistics` mengembalikan:

- `totalPlayers`: `count` pada Player.
- `totalHeroesOwned`: `count` pada PlayerHero.
- `totalDiamond`: `aggregate` dengan `_sum` pada kolom diamond (0 jika belum ada player).
- `mostOwnedHero`: `groupBy` PlayerHero berdasarkan `heroId`, diurutkan dari pemilik terbanyak. Jika seri, diambil hero dengan ID terkecil. Bernilai `null` jika belum ada hero yang dimiliki.
- `heroesPerRole`: `groupBy` Hero berdasarkan `role`, diurutkan dari jumlah terbanyak.

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

Hasil acuan bagian Marvel (testcase 16 sampai 21 dan 25) jika seluruh testcase dijalankan berurutan sekali dari seed:

- 16: player 3 mendapat 300 BP, saldo menjadi 10300 BP.
- 17: 400, Freya tidak bisa dibeli dengan BP.
- 18: 201, Diamond player 3 menjadi 107 (706 dari top up dikurangi 599).
- 19: 201, BP player 3 menjadi 8300.
- 20: 409, player 3 sudah memiliki Layla.
- 21: 400, BP player 1 (1500) kurang untuk Hirara (32000).
- 25: 4 player, 6 hero dimiliki, total 3074 Diamond, hero terbanyak Layla dengan 2 pemilik.

Angka di gambar soal bisa berbeda karena diambil setelah beberapa request dijalankan lebih dari sekali.

Router anggota lain bisa dipasang di `src/routes/index.ts`. Gunakan instance Prisma di `src/config/prisma.ts` dan helper response di `src/utils/response.ts` yang sama.