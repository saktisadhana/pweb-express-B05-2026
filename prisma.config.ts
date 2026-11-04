import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // URL boleh kosong untuk generate/validate, tapi wajib diisi saat migrasi.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? "" },
});
