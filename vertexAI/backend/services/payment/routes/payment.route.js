import express from "express"
import { createOrder, verify } from "../controllers/payment.controllers.js"

const router = express.Router()

router.post("/create", createOrder)
router.post("/create-order", createOrder)
router.post("/verify", verify)

export default router
