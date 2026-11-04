import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

export const buyHero = async (req: Request, res: Response) => {
  const playerId = parseId(req.params.player_id);
  const { heroId, currency } = req.body ?? {};

  // 1. Validasi body
  if (!Number.isInteger(heroId) || (currency !== "BP" && currency !== "DIAMOND")) {
    throw new HttpError(400, "heroId wajib diisi dan currency harus BP atau DIAMOND");
  }

  // 2. Cek player
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 3. Cek hero
  const hero = await prisma.hero.findUnique({ where: { id: heroId } });
  if (!hero) {
    throw new HttpError(404, "Hero tidak ditemukan");
  }

  // 4. Cek harga hero untuk currency yang dipilih
  const price = currency === "BP" ? hero.priceBP : hero.priceDiamond;
  if (price === null) {
    throw new HttpError(400, `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`);
  }

  // 5. Cek apakah player sudah punya hero ini
  const owned = await prisma.playerHero.findUnique({
    where: { playerId_heroId: { playerId, heroId } },
  });
  if (owned) {
    throw new HttpError(409, `Player sudah memiliki hero ${hero.name}`);
  }

  // 6. Cek saldo cukup atau tidak
  const balance = currency === "BP" ? player.bp : player.diamond;
  if (balance < price) {
    throw new HttpError(400, `Saldo ${currency} tidak cukup untuk membeli ${hero.name}`);
  }

  // Kurangi saldo + catat kepemilikan, berhasil bersama atau gagal bersama
  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: currency === "BP"
        ? { bp: { decrement: price } }
        : { diamond: { decrement: price } },
    }),
    prisma.playerHero.create({
      data: { playerId, heroId, currency, pricePaid: price },
    }),
  ]);

  sendSuccess(res, 201, "Hero berhasil dibeli", {
    hero: { id: hero.id, name: hero.name },
    currency,
    pricePaid: price,
    balance: { bp: updatedPlayer.bp, diamond: updatedPlayer.diamond },
  });
};