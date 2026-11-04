import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import heroRows from "../data/heroes.json";
import skinRows from "../data/skins.json";

const db = vi.hoisted(() => ({
  hero: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(), $queryRaw: vi.fn(),
}));
vi.mock("../src/config/prisma", () => ({ default: db }));
import app from "../src/app";

const heroes = heroRows.map((row, index) => ({
  id: index + 1, name: row.name, role: row.primaryRole, lane: row.primaryLane,
  releaseYear: row.releaseYear, priceBP: row.priceBP, priceDiamond: row.priceDiamond,
}));
const collie = { name: "Collie", role: "MAGE", lane: "MID", releaseYear: 2026, priceBP: 32000, priceDiamond: 599 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.$transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
  db.hero.findMany.mockResolvedValue(heroes.slice(0, 10));
  db.hero.count.mockResolvedValue(133);
  db.hero.findUnique.mockResolvedValue(null);
  db.hero.create.mockResolvedValue({ id: 134, ...collie });
});
afterEach(() => vi.restoreAllMocks());

describe("Setup dan middleware", () => {
  it("menyediakan informasi API", async () => {
    expect((await request(app).get("/")).status).toBe(200);
  });

  it("health memeriksa koneksi dengan query database", async () => {
    db.$queryRaw.mockResolvedValue([{ value: 1 }]);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: true, message: expect.any(String) });
    expect(res.body).not.toHaveProperty("metadata");
    expect(db.$queryRaw).toHaveBeenCalledOnce();
  });

  it("logger mencatat path lengkap dan status, tanpa query atau body", async () => {
    await request(app).get("/api/heroes?search=rahasia");
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/api\/heroes 200/));
    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain("rahasia");
  });

  it("endpoint tidak terdaftar mengirim JSON 404", async () => {
    const res = await request(app).get("/tidak-ada");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ status: false, message: expect.any(String) });
  });

  it.each(["/api/skins", "/api/players/1", "/api/statistics"])("tidak mengambil alih fitur anggota lain: %s", async (path) => {
    expect((await request(app).get(path)).status).toBe(404);
  });

  it("JSON rusak tetap menggunakan format response gagal", async () => {
    const res = await request(app).post("/api/heroes").set("Content-Type", "application/json").send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: false, message: expect.any(String) });
  });

  it("body terlalu besar tetap menggunakan format response gagal", async () => {
    const res = await request(app).post("/api/heroes").send({ ...collie, name: "a".repeat(110_000) });
    expect(res.status).toBe(413);
    expect(res.body.status).toBe(false);
  });

  it.each([["P2002", 409], ["P2025", 404], ["P2003", 400]])("memetakan Prisma %s menjadi %i", async (code, status) => {
    db.hero.findUnique.mockRejectedValue({ code });
    const res = await request(app).get("/api/heroes/18");
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ status: false, message: expect.any(String) });
  });

  it("tidak membocorkan detail driver database", async () => {
    db.$queryRaw.mockRejectedValue(new Error("postgresql://user:secret@host/db"));
    const res = await request(app).get("/health");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("secret");
  });
});

describe("GET /api/heroes", () => {
  it("menggunakan default page 1 dan limit 10", async () => {
    const res = await request(app).get("/api/heroes");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.data).toEqual(heroes.slice(0, 10));
    expect(res.body.metadata).toEqual({ currentPage: 1, limit: 10, totalItems: 133, totalPages: 14 });
    expect(db.hero.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 0, take: 10, orderBy: { id: "asc" } }));
    expect(db.hero.count).toHaveBeenCalledWith({ where: {} });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Array), { isolationLevel: "RepeatableRead" });
  });

  it("testcase resmi 02: MARKSMAN berjumlah 20, dengan limit 5", async () => {
    const marksmen = heroes.filter(hero => hero.role === "MARKSMAN");
    expect(marksmen).toHaveLength(20);
    db.hero.findMany.mockResolvedValue(marksmen.slice(0, 5));
    db.hero.count.mockResolvedValue(marksmen.length);
    const res = await request(app).get("/api/heroes?role=MARKSMAN&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.metadata).toEqual({ currentPage: 1, limit: 5, totalItems: 20, totalPages: 4 });
    expect(db.hero.count).toHaveBeenCalledWith({ where: { role: "MARKSMAN" } });
  });

  it("testcase resmi 03: search la berjumlah 10 dan case-insensitive", async () => {
    const matches = heroes.filter(hero => hero.name.toLowerCase().includes("la"));
    expect(matches).toHaveLength(10);
    db.hero.findMany.mockResolvedValue(matches);
    db.hero.count.mockResolvedValue(matches.length);
    const res = await request(app).get("/api/heroes?search=LA");
    expect(res.status).toBe(200);
    expect(res.body.metadata.totalItems).toBe(10);
    expect(db.hero.count).toHaveBeenCalledWith({ where: { name: { contains: "LA", mode: "insensitive" } } });
  });

  it("menggabungkan search, role, dan pagination dengan where count yang sama", async () => {
    await request(app).get("/api/heroes?search=la&role=MARKSMAN&page=2&limit=5");
    const args = db.hero.findMany.mock.calls[0]![0];
    expect(args).toMatchObject({ skip: 5, take: 5, where: { role: "MARKSMAN", name: { contains: "la", mode: "insensitive" } } });
    expect(db.hero.count).toHaveBeenCalledWith({ where: args.where });
  });

  it("hasil kosong mempunyai totalPages 0", async () => {
    db.hero.findMany.mockResolvedValue([]);
    db.hero.count.mockResolvedValue(0);
    const res = await request(app).get("/api/heroes?search=tidak-ada");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.metadata.totalPages).toBe(0);
  });

  it("membatasi limit maksimal 100", async () => {
    const res = await request(app).get("/api/heroes?limit=999");
    expect(res.status).toBe(200);
    expect(res.body.metadata.limit).toBe(100);
    expect(db.hero.findMany.mock.calls[0]![0].take).toBe(100);
  });

  it.each([
    "page=0", "page=-1", "page=1.5", "page=abc", "limit=0", "limit=NaN",
    "limit=1.5", "role=INVALID", "role=", "role=TANK&role=MAGE",
    "page=1&page=2", "search=a&search=b", "page=9007199254740992",
    "page=2147483647&limit=100",
  ])("menolak query tidak valid %s", async (query) => {
    const res = await request(app).get(`/api/heroes?${query}`);
    expect(res.status).toBe(400);
    expect(db.hero.findMany).not.toHaveBeenCalled();
    expect(db.hero.count).not.toHaveBeenCalled();
  });
});

describe("GET /api/heroes/:hero_id", () => {
  it("testcase resmi 04: Layla dengan 11 skin melalui include", async () => {
    const skins = skinRows.filter(skin => skin.heroId === 18);
    expect(skins).toHaveLength(11);
    db.hero.findUnique.mockResolvedValue({ ...heroes[17], skins });
    const res = await request(app).get("/api/heroes/18");
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Layla");
    expect(res.body.data.skins).toHaveLength(11);
    expect(res.body).not.toHaveProperty("metadata");
    expect(db.hero.findUnique).toHaveBeenCalledWith({ where: { id: 18 }, include: { skins: true } });
  });

  it("testcase resmi 05: hero tidak ada menghasilkan 404", async () => {
    expect((await request(app).get("/api/heroes/999")).status).toBe(404);
  });

  it.each(["abc", "0", "-1", "1.5", "0x12", "2147483648"])("menolak ID %s", async (id) => {
    expect((await request(app).get(`/api/heroes/${id}`)).status).toBe(400);
    expect(db.hero.findUnique).not.toHaveBeenCalled();
  });
});

describe("POST /api/heroes", () => {
  it("testcase resmi 06: membuat Collie sebagai hero 134", async () => {
    const res = await request(app).post("/api/heroes").send(collie);
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: 134, ...collie });
    expect(res.body).not.toHaveProperty("metadata");
    expect(db.hero.create).toHaveBeenCalledWith({ data: collie });
  });

  it("testcase resmi 07: nama yang sama menghasilkan 409", async () => {
    db.hero.findUnique.mockResolvedValue(heroes[0]);
    expect((await request(app).post("/api/heroes").send({ ...collie, name: "Miya" })).status).toBe(409);
    expect(db.hero.create).not.toHaveBeenCalled();
  });

  it("testcase resmi 08: data kurang diperiksa sebelum nama duplikat", async () => {
    db.hero.findUnique.mockResolvedValue(heroes[0]);
    expect((await request(app).post("/api/heroes").send({ name: "Miya" })).status).toBe(400);
    expect(db.hero.findUnique).not.toHaveBeenCalled();
  });

  it.each(["name", "role", "lane", "releaseYear"])("menolak field wajib %s yang tidak dikirim", async (field) => {
    const body: Record<string, unknown> = { ...collie };
    delete body[field];
    expect((await request(app).post("/api/heroes").send(body)).status).toBe(400);
    expect(db.hero.create).not.toHaveBeenCalled();
  });

  it.each([
    undefined, [], { ...collie, name: " " }, { ...collie, name: 5 },
    { ...collie, role: "mage" }, { ...collie, lane: "INVALID" },
    { ...collie, releaseYear: 0 }, { ...collie, releaseYear: 2026.5 },
    { ...collie, releaseYear: "2026" }, { ...collie, priceBP: -1 },
    { ...collie, priceDiamond: 1.5 }, { ...collie, priceDiamond: "599" },
  ])("menolak body tidak valid %j", async (body) => {
    expect((await request(app).post("/api/heroes").send(body)).status).toBe(400);
    expect(db.hero.create).not.toHaveBeenCalled();
  });

  it("harga yang tidak dikirim disimpan sebagai null, bukan 0", async () => {
    const { priceBP, priceDiamond, ...body } = collie;
    await request(app).post("/api/heroes").send(body);
    expect(db.hero.create).toHaveBeenCalledWith({ data: { ...body, priceBP: null, priceDiamond: null } });
  });

  it("menerima harga null dan harga 0 sebagai dua nilai berbeda", async () => {
    await request(app).post("/api/heroes").send({ ...collie, priceBP: null, priceDiamond: 0 });
    expect(db.hero.create.mock.calls[0]![0].data).toMatchObject({ priceBP: null, priceDiamond: 0 });
  });

  it("tidak meneruskan ID dan field asing dari client", async () => {
    await request(app).post("/api/heroes").send({ ...collie, name: "  Collie  ", id: 1, skins: { deleteMany: {} } });
    expect(db.hero.create).toHaveBeenCalledWith({ data: collie });
  });

  it("unique constraint tetap memberi 409 jika insert bersamaan", async () => {
    db.hero.create.mockRejectedValue({ code: "P2002" });
    expect((await request(app).post("/api/heroes").send(collie)).status).toBe(409);
  });
});
