import { Router } from "express";
import { body } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { authenticate } from "../middleware/authenticate";
import { OrdersController } from "../controllers/OrdersController";

const router = Router();

// ---- POST ---- //
router.post(
    "/create-order",
    authenticate,
    body("amount").notEmpty().withMessage("La Cantidad es Obligatoria"),
    body("totalPrice").notEmpty().withMessage("El Precio Total es Obligatorio"),
    body("addressId").notEmpty().withMessage("La Dirección es Obligatoria"),
    body("userId").notEmpty().withMessage("El Usuario es Obligatorio"),
    handleInputErrors,
    OrdersController.createOrder
);

router.post(
    "/cancel-order",
    authenticate,
    body("orderId").notEmpty().withMessage("La Orden es Obligatoria"),
    handleInputErrors,
    OrdersController.cancelOrder
);

router.post(
    "/confirm-order",
    authenticate,
    body("orderId").notEmpty().withMessage("La Orden es Obligatoria"),
    handleInputErrors,
    OrdersController.confirmOrder
);

router.post(
    "/assing-delivery",
    authenticate,
    body("orderId").notEmpty().withMessage("La Orden es Obligatoria"),
    body("deliveryId").notEmpty().withMessage("El Repartidor es Obligatorio"),
    handleInputErrors,
    OrdersController.assingDelivery
);
// ---- POST ---- //

// ---- GET ---- //
router.get("/orders", authenticate, OrdersController.getAllOrders);
router.get(
    "/orders/orders-user/:userId",
    authenticate,
    OrdersController.getOrdersByUser
);
router.get(
    "/orders/orders-delivery/:deliveryId",
    authenticate,
    OrdersController.getOrdersByDelivery
);
router.get("/deliveries", authenticate, OrdersController.getAllDeliveries);
// ---- GET ---- //

export default router;
