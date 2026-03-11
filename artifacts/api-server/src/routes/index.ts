import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mangleRouter from "./mangle";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mangleRouter);

export default router;
