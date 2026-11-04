import express from "express";
import prisma from "./config/prisma";
import { errorHandler, notFound } from "./middlewares/error";
import { logger } from "./middlewares/logger";
import router from "./routes";
import { sendSuccess } from "./utils/response";

const app = express();
app.disable("x-powered-by");
app.use(logger);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/", (_req, res) => {
  sendSuccess(res, 200, "MLBB Shop API", { health: "/health", heroes: "/api/heroes" });
});
app.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  sendSuccess(res, 200, "Server dan database terhubung");
});
app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

export default app;
