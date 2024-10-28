import type { Request, Response } from "express";
import { User } from "../models/User";
import { Token } from "../models/Token";
import { Role } from "../models/Role";
import { RoleAction } from "../models/RoleAction";
import { Action } from "../models/Action";
import {
    checkPassword,
    hashPassword,
    hasPermissions,
    roleUser,
} from "../utils/auth";
import { generateToken } from "../utils/token";
import { AuthEmail } from "../emails/AuthEmail";
import { generateJWT } from "../utils/jwt";
import { CustomRequest } from "../middleware/authenticate";

export class UserController {
    static login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            // Busca el usuario por email
            const user = await User.findOne({
                where: { email },
                include: [Role],
            });

            if (!user) {
                const error = new Error("El usuario no fue encontrado");
                return res.status(404).json({ errors: error.message });
            }

            if (!user.get("confirmed")) {
                const token = await Token.create({
                    userId: user.get("id"),
                    token: generateToken(),
                });

                AuthEmail.sendConfirmationEmail({
                    email: user.get("email"),
                    name: user.get("name"),
                    token: token.get("token"),
                });

                const error = new Error(
                    "El usuario no está confirmado, hemos enviado un email de confirmación"
                );
                return res.status(401).json({ errors: error.message });
            }

            const isPasswordCorrect = await checkPassword(
                password,
                user.get("password")
            );
            if (!isPasswordCorrect) {
                const error = new Error("La contraseña es incorrecta");
                return res.status(401).json({ errors: error.message });
            }

            const token = await generateJWT({
                id: user.get("id"),
                confirmed: user.get("confirmed"),
            });

            // Obtén las acciones asociadas al rol del usuario
            const roleActions = await RoleAction.findAll({
                where: { roleId: user.get("roleId") },
                include: {
                    model: Action,
                    attributes: ["name"],
                },
            });

            // Modificación aquí para acceder a las acciones correctamente
            const actions = roleActions
                .map((roleAction) => {
                    const action = roleAction.getDataValue("Action");
                    return action ? action.get("name") : null;
                })
                .filter((name) => name !== null);

            res.send({
                jwt: token,
                user: {
                    id: user.get("id"),
                    name: user.get("name"),
                    lastname: user.get("lastname"),
                    email: user.get("email"),
                    role: user.get("role"),
                    actions: actions,
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getUser = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const { idUser } = req.params;

            const permissions = await hasPermissions(id, "GET_USERS");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const user = await User.findByPk(idUser, {
                attributes: { exclude: ["password", "createdAt", "updatedAt"] },
                include: {
                    model: Role,
                    attributes: ["name"],
                },
            });

            if (!user) {
                const error = new Error("El Usuario no ha sido encontrado");
                return res.status(404).json({ errors: error.message });
            }

            res.send(user);
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static createUser = async (req: Request, res: Response) => {
        try {
            const { name, lastname, email, password } = req.body;

            const userExists = await User.findOne({ where: { email } });
            if (userExists) {
                const error = new Error("El Usuario ya está registrado");
                return res.status(409).json({ errors: error.message });
            }

            const hashedPassword = await hashPassword(password);
            const roleId = await roleUser();
            const user = await User.create({
                name,
                lastname,
                email,
                password: hashedPassword,
                roleId: roleId,
            });

            const token = await Token.create({
                token: generateToken(),
                userId: user.get("id"),
            });

            AuthEmail.sendConfirmationEmail({
                email: user.get("email"),
                name: user.get("name"),
                token: token.get("token"),
            });

            res.send("Usuario Creado Correctamente, revisa tu email");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static deleteUser = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "DELETE_USERS");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { idUser } = req.body;

            const user = await User.findByPk(idUser);
            if (!user) {
                const error = new Error("El Usuario no fue encontrado");
                return res.status(404).json({ errors: error.message });
            }

            user.active = false;
            await user.save();

            res.send("Usuario eliminado correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static confirmUser = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;

            const tokenExists = await Token.findOne({ where: { token } });
            if (!tokenExists) {
                const error = new Error("Token no válido");
                return res.status(404).json({ errors: error.message });
            }

            const user = await User.findByPk(tokenExists.get("userId"));
            user.set("confirmed", true);

            await Promise.all([user.save(), tokenExists.destroy()]);

            res.send("Cuenta confirmada correctamente");
        } catch (error) {
            console.log(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static resetPassword = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            const user = await User.findOne({ where: { email } });
            if (!user) {
                const error = new Error("El Usuario no está registrado");
                return res.status(409).json({ errors: error.message });
            }

            const token = await Token.create({
                token: generateToken(),
                userId: user.get("id"),
            });

            AuthEmail.sendPasswordResetToken({
                email: user.get("email"),
                name: user.get("name"),
                token: token.get("token"),
            });

            res.send("Revisa tu email para instrucciones");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static validateToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;

            const tokenExists = await Token.findOne({ where: { token } });
            if (!tokenExists) {
                const error = new Error("Token no válido");
                return res.status(404).json({ errors: error.message });
            }

            res.send("Token validado correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static updatePassword = async (req: Request, res: Response) => {
        try {
            const { token } = req.params;
            const { password } = req.body;

            const tokenExists = await Token.findOne({ where: { token } });
            if (!tokenExists) {
                const error = new Error("Token no válido");
                return res.status(404).json({ errors: error.message });
            }

            const user = await User.findByPk(tokenExists.get("userId"));
            const hashedPassword = await hashPassword(password);
            user.set("password", hashedPassword);

            await Promise.all([user.save(), tokenExists.destroy()]);

            res.send("El Password se Modificó Correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };
}
