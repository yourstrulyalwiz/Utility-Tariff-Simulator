import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import simulationsRouter from "./simulations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(simulationsRouter);

export default router;
