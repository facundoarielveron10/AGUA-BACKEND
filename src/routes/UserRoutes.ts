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

router.post(
    "/change-role",
    authenticate,
    body("role").notEmpty().withMessage("El Rol no puede ir vacio"),
    body("userId")
        .notEmpty()
        .withMessage("El ID del Usuario no puede ir vacio"),
    handleInputErrors,
    UserController.changeRole
);

router.post(
    "/create-user",
    authenticate,
    body("name").notEmpty().withMessage("El Nombre es Obligatorio"),
    body("lastname").notEmpty().withMessage("El Apellido es Obligatorio"),
    body("email").isEmail().withMessage("El Email del Usuario es Obligatorio"),
    body("password")
        .isLength({ min: 8 })
        .withMessage("La Contraseña es muy corta, minimo 8 caracteres"),
    body("passwordConfirm").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Las Contraseñas no son iguales");
        }
        return true;
    }),
    body("role").notEmpty().withMessage("El Rol es Obligatorio"),
    handleInputErrors,
    UserController.createUserWithRole
);

router.post(
    "/edit-user",
    authenticate,
    body("userId").notEmpty().withMessage("El ID es Obligatorio"),
    body("name").notEmpty().withMessage("El Nombre es Obligatorio"),
    body("lastname").notEmpty().withMessage("El Apellido es Obligatorio"),
    body("email").isEmail().withMessage("El Email del Usuario es Obligatorio"),
    body("password")
        .optional({ checkFalsy: true })
        .isLength({ min: 8 })
        .withMessage("La Contraseña es muy corta, mínimo 8 caracteres"),
    body("passwordConfirm").custom((value, { req }) => {
        if (req.body.password && value !== req.body.password) {
            throw new Error("Las Contraseñas no son iguales");
        }
        return true;
    }),
    body("role").notEmpty().withMessage("El Rol es Obligatorio"),
    handleInputErrors,
    UserController.editUser
);

router.post(
    "/delete-user",
    authenticate,
    body("userId").notEmpty().withMessage("El ID es obligatorio"),
    handleInputErrors,
    UserController.deleteUser
);

router.post(
    "/active-user",
    authenticate,
    body("userId").notEmpty().withMessage("El ID es obligatorio"),
    handleInputErrors,
    UserController.activateUser
);

router.post(
    "/search-users",
    authenticate,
    body("search")
        .notEmpty()
        .withMessage("Debe proporcionar un término de búsqueda"),
    handleInputErrors,
    UserController.searchUser
);
// ---- POST ---- //

// ---- GET ---- //
router.get(
    "/user/:userId",
    authenticate,
    param("userId")
        .isNumeric()
        .withMessage("El ID del usuario debe ser un número válido"),
    handleInputErrors,
    UserController.getUser
);

router.get("/users", authenticate, UserController.getAllUsers);
// ---- GET ---- //

export default router;
