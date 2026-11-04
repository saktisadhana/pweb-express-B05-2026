import { Router } from "express";
import heroRouter from "./hero.routes";
import playerRouter from "./player.routes";
import statisticRouter from "./statistic.routes";

const router = Router();
router.use("/heroes", heroRouter);
router.use("/players", playerRouter);
router.use("/statistics", statisticRouter);
export default router;