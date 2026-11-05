import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

export const topUp = async (req: Request, res: Response) => {
  const playerId = parseId(req.params.player_id);
  const { amount } = req.body ?? {};

  // 1. Validasi amount
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpError(400, "amount harus bilangan bulat lebih dari 0");
  }

  // 2. Cek player
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 3. Tambah diamond
  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: { diamond: { increment: amount } },
  });

  sendSuccess(res, 200, "Top up berhasil", {
    playerId,
    amount,
    diamond: updatedPlayer.diamond,
  });
};