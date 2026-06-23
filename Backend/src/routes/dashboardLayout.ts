import { Router } from "express";
import { getLayout, saveLayout, resetLayout } from "../controllers/dashboardLayoutController";
import { protect } from "../middleware/auth";

const router = Router();

router.use(protect);

router.get("/", getLayout);
router.put("/", saveLayout);
router.delete("/", resetLayout);

export default router;
