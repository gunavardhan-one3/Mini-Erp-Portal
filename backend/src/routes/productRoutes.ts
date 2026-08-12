import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, requireRole } from "../middleware/auth";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  createStockMovement,
  listStockMovements,
} from "../controllers/productController";

const router = Router();

router.use(authenticate);

router.get("/", listProducts);
router.get("/:id", getProduct);
router.get("/:id/stock-movements", listStockMovements);

router.post("/", requireRole(Role.Admin, Role.Warehouse), createProduct);
router.put("/:id", requireRole(Role.Admin, Role.Warehouse), updateProduct);
router.post("/:id/stock-movements", requireRole(Role.Admin, Role.Warehouse), createStockMovement);

export default router;
