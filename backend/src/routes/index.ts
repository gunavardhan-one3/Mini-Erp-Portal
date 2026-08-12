import { Router } from "express";
import authRoutes from "./authRoutes";
import customerRoutes from "./customerRoutes";
import productRoutes from "./productRoutes";
import challanRoutes from "./challanRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);
router.use("/challans", challanRoutes);

export default router;
