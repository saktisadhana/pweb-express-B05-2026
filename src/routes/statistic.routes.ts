import { Router } from "express";
import { getStatistics } from "../controllers/statisticController";

const router = Router();
router.get("/", getStatistics);
export default router;