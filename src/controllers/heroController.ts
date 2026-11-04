import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { Role } from "../generated/prisma/enums";
import { HttpError } from "../utils/http-error";
import { parseHeroInput } from "../utils/hero-input";
import { parseEnum, parseId, parsePagination } from "../utils/parse";
import { sendSuccess } from "../utils/response";

export const getAllHeroes = async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const role = req.query.role === undefined ? undefined : parseEnum(req.query.role, Role, "role");
  if (req.query.search !== undefined && typeof req.query.search !== "string") {
    throw new HttpError(400, "search harus berupa string");
  }
  const search = req.query.search?.trim();
  const where = {
    ...(role !== undefined && { role }),
    ...(search && { name: { contains: search, mode: "insensitive" as const } }),
  };
  const [heroes, total] = await prisma.$transaction([
    prisma.hero.findMany({ where, skip, take: limit, orderBy: { id: "asc" } }),
    prisma.hero.count({ where }),
  ], { isolationLevel: "RepeatableRead" });

  sendSuccess(res, 200, "Berhasil mengambil data hero", heroes, {
    currentPage: page, limit, totalItems: total, totalPages: Math.ceil(total / limit),
  });
};

export const getHeroById = async (req: Request, res: Response) => {
  const hero = await prisma.hero.findUnique({
    where: { id: parseId(req.params.hero_id) }, include: { skins: true },
  });
  if (!hero) throw new HttpError(404, "Hero tidak ditemukan");
  sendSuccess(res, 200, "Berhasil mengambil detail hero", hero);
};

export const createHero = async (req: Request, res: Response) => {
  // Urutan soal: cek field wajib sebelum nama duplikat.
  const data = parseHeroInput(req.body);
  const existing = await prisma.hero.findUnique({ where: { name: data.name }, select: { id: true } });
  if (existing) throw new HttpError(409, "Nama hero sudah terdaftar");
  // Nama bisa bentrok saat request bersamaan; middleware menangani P2002.
  const hero = await prisma.hero.create({ data });
  sendSuccess(res, 201, "Hero berhasil dibuat", hero);
};
