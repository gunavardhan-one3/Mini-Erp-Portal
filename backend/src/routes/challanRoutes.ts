import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, requireRole } from "../middleware/auth";
import {
  createChallan,
  listChallans,
  getChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from "../controllers/challanController";

const router = Router();

router.use(authenticate);

router.get("/", listChallans);
router.get("/:id", getChallan);

router.post("/", requireRole(Role.Admin, Role.Sales), createChallan);
router.put("/:id", requireRole(Role.Admin, Role.Sales), updateChallan);
router.post("/:id/confirm", requireRole(Role.Admin, Role.Sales), confirmChallan);
router.post("/:id/cancel", requireRole(Role.Admin, Role.Sales), cancelChallan);

export default router;
