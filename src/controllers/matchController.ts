import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

export const playMatch = async (req: Request, res: Response) => {
  const playerId = parseId(req.params.player_id);
  const { result } = req.body ?? {};

  // 1. Validasi body
  if (result !== "WIN" && result !== "LOSE") {
    throw new HttpError(400, "result harus WIN atau LOSE");
  }

  // 2. Cek player ada atau tidak
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    throw new HttpError(404, "Player tidak ditemukan");
  }

  // 3. Tambah BP sesuai hasil match
  const bpEarned = result === "WIN" ? 300 : 100;
  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: { bp: { increment: bpEarned } },
  });

  sendSuccess(res, 200, "Hadiah match berhasil ditambahkan", {
    playerId,
    result,
    bpEarned,
    bp: updatedPlayer.bp,
  });
};