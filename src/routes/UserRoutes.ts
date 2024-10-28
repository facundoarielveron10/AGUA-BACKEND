import { Router } from "express";
import { body, param } from "express-validator";
import { UserController } from "../controllers/UserController";
import { handleInputErrors } from "../middleware/validation";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// ---- POST ---- //
router.post(
    "/login",
    body("email").isEmail().withMessage("El Email es Obligatorio"),
    body("password").notEmpty().withMessage("La Contraseña es Obligatoria"),
    handleInputErrors,
    UserController.login
);

router.post(
    "/register",
    body("name").notEmpty().withMessage("El Nombre es obligatorio"),
    body("lastname").notEmpty().withMessage("El Apellido es obligatorio"),
    body("email").isEmail().withMessage("El Email del usuario es obligatorio"),
    body("password")
        .isLength({ min: 8 })
        .withMessage("La Contraseña es muy corta, mínimo 8 caracteres"),
    body("passwordConfirm").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Las Contraseñas no son iguales");
        }
        return true;
    }),
    handleInputErrors,
    UserController.createUser
);

router.post(
    "/confirm",
    body("token").notEmpty().withMessage("El Token no puede ir vacío"),
    handleInputErrors,
    UserController.confirmUser
);

router.post(
    "/reset-password",
    body("email").isEmail().withMessage("El Email del Usuario es obligatorio"),
    handleInputErrors,
    UserController.resetPassword
);

router.post(
    "/validate-token",
    body("token").notEmpty().withMessage("El Token no puede ir vacío"),
    handleInputErrors,
    UserController.validateToken
);

router.post(
    "/update-password/:token",
    param("token").notEmpty().withMessage("El Token es obligatorio"),
    body("password")
        .isLength({ min: 8 })
        .withMessage("La Contraseña es muy corta, mínimo 8 caracteres"),
    body("passwordConfirm").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Las Contraseñas no son iguales");
        }
        return true;
    }),
    handleInputErrors,
    UserController.updatePassword
);

// ---- POST ---- //

// ---- GET ---- //
router.get(
    "/user/:idUser",
    authenticate,
    param("idUser")
        .isNumeric()
        .withMessage("El ID del usuario debe ser un número válido"),
    handleInputErrors,
    UserController.getUser
);
// ---- GET ---- //

export default router;
