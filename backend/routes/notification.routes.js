import express from "express";
import { 
    getNotifications,
    deleteNotifications,
    deleteNotification
 } from "../controllers/notification.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/all", protectRoute, getNotifications);
router.delete("/" , protectRoute , deleteNotifications);
router.delete("/:id" , protectRoute , deleteNotification);


export default router