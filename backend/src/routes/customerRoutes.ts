import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, requireRole } from "../middleware/auth";
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  addFollowUp,
} from "../controllers/customerController";

const router = Router();

router.use(authenticate);

router.get("/", listCustomers);
router.get("/:id", getCustomer);

router.post("/", requireRole(Role.Admin, Role.Sales), createCustomer);
router.put("/:id", requireRole(Role.Admin, Role.Sales), updateCustomer);
router.post("/:id/followups", requireRole(Role.Admin, Role.Sales), addFollowUp);

export default router;
