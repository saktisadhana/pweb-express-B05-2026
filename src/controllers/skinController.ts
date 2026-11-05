import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { Rarity } from "../generated/prisma/enums";
import { HttpError } from "../utils/http-error";
import { parseEnum, parseId, parsePagination } from "../utils/parse";
import { sendSuccess } from "../utils/response";

export const getAllSkins = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);

  // Susun filter hanya dari query yang dikirim
  const where: { heroId?: number; rarity?: Rarity } = {};
  if (req.query.heroId !== undefined) {
    where.heroId = parseId(req.query.heroId);
  }
  if (req.query.rarity !== undefined) {
    where.rarity = parseEnum(req.query.rarity, Rarity, "rarity");
  }

  const [skins, total] = await prisma.$transaction([
    prisma.skin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id: "asc" },
      include: { hero: { select: { name: true } } },
    }),
    prisma.skin.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data skin", skins, {
    currentPage: page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getSkinById = async (req: Request, res: Response) => {
  const skin = await prisma.skin.findUnique({
    where: { id: parseId(req.params.skin_id) },
    include: { hero: true },
  });
  if (!skin) {
    throw new HttpError(404, "Skin tidak ditemukan");
  }

  sendSuccess(res, 200, "Berhasil mengambil detail skin", skin);
};