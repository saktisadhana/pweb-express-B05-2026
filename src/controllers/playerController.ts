import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

export const createPlayer = async (req: Request, res: Response) => {
  const { nickname } = req.body ?? {};

  if (typeof nickname !== "string" || !nickname.trim()) {
    throw new HttpError(400, "nickname wajib diisi");
  }

  const existing = await prisma.player.findUnique({ where: { nickname: nickname.trim() } });
  if (existing) {
    throw new HttpError(409, "Nickname sudah dipakai");
  }

  // bp dan diamond otomatis 10000 dan 0 dari default schema
  const player = await prisma.player.create({ data: { nickname: nickname.trim() } });

  sendSuccess(res, 201, "Player berhasil dibuat", player);
};

export const getPlayerById = async (req: Request, res: Response) => {
  const player = await prisma.player.findUnique({
    where: { id: parseId(req.params.player_id) },
    include: { heroes: { include: { hero: true }, orderBy: { id: "asc" } } },
  });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  sendSuccess(res, 200, "Berhasil mengambil data player", {
    id: player.id,
    nickname: player.nickname,
    bp: player.bp,
    diamond: player.diamond,
    createdAt: player.createdAt,
    heroes: player.heroes.map((owned) => ({
      heroId: owned.heroId,
      name: owned.hero.name,
      currency: owned.currency,
      pricePaid: owned.pricePaid,
    })),
  });
};

export const updatePlayer = async (req: Request, res: Response) => {
  const playerId = parseId(req.params.player_id);
  const { nickname } = req.body ?? {};

  // 1. Cek player
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 2. Validasi nickname
  if (typeof nickname !== "string" || !nickname.trim()) {
    throw new HttpError(400, "nickname wajib diisi");
  }

  // 3. Cek nickname dipakai player lain
  const existing = await prisma.player.findUnique({ where: { nickname: nickname.trim() } });
  if (existing && existing.id !== playerId) {
    throw new HttpError(409, "Nickname sudah dipakai player lain");
  }

  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: { nickname: nickname.trim() },
  });

  sendSuccess(res, 200, "Nickname berhasil diubah", updatedPlayer);
};

export const deletePlayer = async (req: Request, res: Response) => {
  const playerId = parseId(req.params.player_id);

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // Data PlayerHero milik player ikut terhapus karena onDelete: Cascade
  await prisma.player.delete({ where: { id: playerId } });

  sendSuccess(res, 200, "Player berhasil dihapus");
};