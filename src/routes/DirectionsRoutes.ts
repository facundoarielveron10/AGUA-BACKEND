import { Router } from "express";
import { body } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { authenticate } from "../middleware/authenticate";
import { DirectionsController } from "../controllers/DirectionsController";

const router = Router();

// ---- POST ---- //
router.post(
    "/create-address",
    authenticate,
    body("address").notEmpty().withMessage("La Dirección es Obligatoria"),
    body("city").notEmpty().withMessage("La Ciudad es Obligatoria"),
    body("country").notEmpty().withMessage("El País es Obligatorio"),
    body("userId").notEmpty().withMessage("El ID del Usuario es Obligatorio"),
    handleInputErrors,
    DirectionsController.createAddress
);
// ---- POST ---- //

router.post(
    "/edit-address",
    authenticate,
    body("address").notEmpty().withMessage("La Dirección es Obligatoria"),
    body("city").notEmpty().withMessage("La Ciudad es Obligatoria"),
    body("country").notEmpty().withMessage("El País es Obligatorio"),
    body("directionId")
        .notEmpty()
        .withMessage("El ID de la Dirección es Obligatorio"),
    handleInputErrors,
    DirectionsController.editAddress
);

router.post(
    "/delete-address",
    authenticate,
    body("directionId")
        .notEmpty()
        .withMessage("El ID de la Dirección es Obligatorio"),
    handleInputErrors,
    DirectionsController.deleteAddress
);
// ---- POST ---- //

// ---- GET ---- //
router.get("/address/:userId", authenticate, DirectionsController.getAddress);
// ---- GET ---- //

export default router;
