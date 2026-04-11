import { Router, type IRouter } from "express";
import healthRouter   from "./health.js";
import authRouter     from "./auth.js";
import usersRouter    from "./users.js";
import plansRouter    from "./plans.js";
import settingsRouter from "./settings.js";
import statsRouter    from "./stats.js";
import licensesRouter from "./licenses.js";
import billingRouter  from "./billing.js";
import portalRouter   from "./portal.js";
import domainsRouter  from "./domains.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth",     authRouter);
router.use("/users",    usersRouter);
router.use("/plans",    plansRouter);
router.use("/settings", settingsRouter);
router.use("/stats",    statsRouter);
router.use("/licenses", licensesRouter);
router.use("/billing",  billingRouter);
router.use("/portal",   portalRouter);
router.use("/domains",  domainsRouter);

export default router;
