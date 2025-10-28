import express from "express";
import {
    subscribeUser,
    getSubscribers,
    unsubscribeUser,
    exportSubscribers,
    getSubscriptionStats
} from "../controllers/subscribe.controller";

const router = express.Router();

router.post("/", subscribeUser);
router.get("/", getSubscribers);
router.delete("/", unsubscribeUser);
router.get("/export", exportSubscribers);
router.get("/stats", getSubscriptionStats);

export default router;