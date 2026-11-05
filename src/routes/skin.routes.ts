import { Router } from "express";
import { getAllSkins, getSkinById } from "../controllers/skinController";

const router = Router();
router.get("/", getAllSkins);
router.get("/:skin_id", getSkinById);
export default router;