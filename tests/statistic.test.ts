import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import heroes from "../data/heroes.json";

const db = vi.hoisted(() => ({
  player: { count: vi.fn(), aggregate: vi.fn() },
  playerHero: { count: vi.fn(), groupBy: vi.fn() },
  hero: { findUnique: vi.fn(), groupBy: vi.fn() },
}));
vi.mock("../src/config/prisma", () => ({ default: db }));
import app from "../src/app";

const roleCounts = new Map<string, number>();
for (const hero of heroes) {
  roleCounts.set(hero.primaryRole, (roleCounts.get(hero.primaryRole) ?? 0) + 1);
}
const heroesPerRole = [...roleCounts].map(([role, total]) => ({ role, total }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.player.count.mockResolvedValue(3);
  db.playerHero.count.mockResolvedValue(4);
  db.player.aggregate.mockResolvedValue({ _sum: { diamond: 2967 } });
  db.playerHero.groupBy.mockResolvedValue([{ heroId: 1, _count: { heroId: 1 } }]);
  db.hero.findUnique.mockResolvedValue({ id: 1, name: "Miya" });
  db.hero.groupBy.mockResolvedValue(heroesPerRole.map(({ role, total }) => ({ role, _count: { role: total } })));
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/statistics", () => {
  it("mengembalikan statistik seed, bukan 404", async () => {
    const res = await request(app).get("/api/statistics");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: true,
      message: expect.any(String),
      data: {
        totalPlayers: 3,
        totalHeroesOwned: 4,
        totalDiamond: 2967,
        mostOwnedHero: { heroId: 1, name: "Miya", owners: 1 },
        heroesPerRole,
      },
    });
  });

  it("menghitung saldo dengan aggregate, bukan jumlah transaksi", async () => {
    await request(app).get("/api/statistics");
    expect(db.player.count).toHaveBeenCalledOnce();
    expect(db.playerHero.count).toHaveBeenCalledOnce();
    expect(db.player.aggregate).toHaveBeenCalledWith({ _sum: { diamond: true } });
  });

  it("memilih hero teratas dengan ID terkecil saat jumlah pemilik seri", async () => {
    await request(app).get("/api/statistics");
    expect(db.playerHero.groupBy).toHaveBeenCalledWith({
      by: ["heroId"],
      _count: { heroId: true },
      orderBy: [{ _count: { heroId: "desc" } }, { heroId: "asc" }],
      take: 1,
    });
  });

  it("mengambil nama hero berdasarkan hasil groupBy", async () => {
    db.playerHero.groupBy.mockResolvedValue([{ heroId: 18, _count: { heroId: 3 } }]);
    db.hero.findUnique.mockResolvedValue({ id: 18, name: "Layla" });
    const res = await request(app).get("/api/statistics");
    expect(res.status).toBe(200);
    expect(res.body.data.mostOwnedHero).toEqual({ heroId: 18, name: "Layla", owners: 3 });
    expect(db.hero.findUnique).toHaveBeenCalledWith({ where: { id: 18 } });
  });

  it("memetakan jumlah hero per role dari groupBy", async () => {
    const res = await request(app).get("/api/statistics");
    expect(res.body.data.heroesPerRole).toEqual(heroesPerRole);
    expect(db.hero.groupBy).toHaveBeenCalledWith({
      by: ["role"],
      _count: { role: true },
      orderBy: [{ _count: { role: "desc" } }, { role: "asc" }],
    });
    expect(res.body).not.toHaveProperty("metadata");
  });

  it("menangani database kosong tanpa mencari detail hero", async () => {
    db.player.count.mockResolvedValue(0);
    db.playerHero.count.mockResolvedValue(0);
    db.player.aggregate.mockResolvedValue({ _sum: { diamond: null } });
    db.playerHero.groupBy.mockResolvedValue([]);
    db.hero.groupBy.mockResolvedValue([]);
    const res = await request(app).get("/api/statistics");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      totalPlayers: 0, totalHeroesOwned: 0, totalDiamond: 0,
      mostOwnedHero: null, heroesPerRole: [],
    });
    expect(db.hero.findUnique).not.toHaveBeenCalled();
  });

  it("error database tetap menggunakan format gagal tanpa kredensial", async () => {
    db.player.count.mockRejectedValue(new Error("postgresql://user:secret@host/db"));
    const res = await request(app).get("/api/statistics");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: false, message: expect.any(String) });
    expect(JSON.stringify(res.body)).not.toContain("secret");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("secret");
  });
});
