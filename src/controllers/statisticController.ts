import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { sendSuccess } from "../utils/response";

export const getStatistics = async (_req: Request, res: Response) => {
  // 1. Hitung jumlah baris
  const totalPlayers = await prisma.player.count();
  const totalHeroesOwned = await prisma.playerHero.count();

  // 2. Jumlahkan diamond semua player
  const diamondResult = await prisma.player.aggregate({
    _sum: { diamond: true },
  });

  // 3. Hero yang paling banyak dimiliki (kalau seri, ambil id terkecil)
  const ownedGroups = await prisma.playerHero.groupBy({
    by: ["heroId"],
    _count: { heroId: true },
    orderBy: [{ _count: { heroId: "desc" } }, { heroId: "asc" }],
    take: 1,
  });

  let mostOwnedHero = null;
  if (ownedGroups.length > 0) {
    const top = ownedGroups[0];
    const hero = await prisma.hero.findUnique({ where: { id: top.heroId } });
    mostOwnedHero = {
      heroId: top.heroId,
      name: hero?.name,
      owners: top._count.heroId,
    };
  }

  // 4. Jumlah hero per role
  const roleGroups = await prisma.hero.groupBy({
    by: ["role"],
    _count: { role: true },
    orderBy: [{ _count: { role: "desc" } }, { role: "asc" }],
  });

  const heroesPerRole = roleGroups.map((group) => ({
    role: group.role,
    total: group._count.role,
  }));

  sendSuccess(res, 200, "Berhasil mengambil statistik", {
    totalPlayers,
    totalHeroesOwned,
    totalDiamond: diamondResult._sum.diamond ?? 0,
    mostOwnedHero,
    heroesPerRole,
  });
};