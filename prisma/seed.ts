import prisma from "../src/config/prisma";
import { readSeedData } from "./seed-data";

try {
  // Cek dataset dulu supaya file rusak tidak menyebabkan data lama terhapus.
  const data = readSeedData();
  console.warn("Seed akan MENGHAPUS seluruh data MLBB Shop dan mengembalikan ID ke 1.");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`;
    await tx.hero.createMany({ data: data.heroes });
    await tx.skin.createMany({ data: data.skins });
    await tx.player.createMany({ data: data.players });
    await tx.playerHero.createMany({ data: data.playerHeroes });
  }, { timeout: 60_000 });
  console.log("Seed selesai: 133 hero, 892 skin, 3 player, 4 PlayerHero.");
} catch (error) {
  console.error("Seed gagal. Periksa dataset, migrasi, dan koneksi Neon.", error instanceof Error ? error.name : "UnknownError");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
