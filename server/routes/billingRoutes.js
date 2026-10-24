import express from "express";
import requireUser from "../middleware/auth.js";
import { confirmCheckout, getPlans, listTransactions, startCheckout } from "../controllers/billingController.js";

const billingRouter = express.Router();

billingRouter.get("/plans", getPlans); // public: the landing page shows prices
billingRouter.get("/transactions", requireUser, listTransactions);
billingRouter.post("/checkout", requireUser, startCheckout);
billingRouter.post("/confirm", requireUser, confirmCheckout);

export default billingRouter;
