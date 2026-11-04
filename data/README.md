# Dataset MLBB Shop

Sumber: [dataset resmi dari soal](https://drive.google.com/file/d/1pwBUD6HnjybfGc4sobwSDYF7myHA7rW3/view?usp=sharing).

Arsipnya berisi `heroes.csv` dan `skins.csv`. Data di sini sudah dikonversi ke JSON: 133 hero dan 892 skin, dengan urutan yang sama. Hanya kolom yang diperlukan soal yang disimpan.

Angka menjadi number JSON, sedangkan harga kosong menjadi `null`. Jangan mengganti `null` dengan 0 karena artinya berbeda saat membeli hero.

`prisma/seed-data.ts` memetakan `primaryRole` ke `role` dan `primaryLane` ke `lane`. Seed tidak mengisi ID secara manual. Setelah reset, Miya mendapat ID 1, Layla 18, Freya 22, Gusion 56, Ling 84, dan Hirara 133.

Jangan mengurutkan ulang hero: `heroId` pada skin dan data kepemilikan memakai urutan tersebut.
