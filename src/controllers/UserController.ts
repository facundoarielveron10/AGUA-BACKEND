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
import { Op } from "sequelize";

export class UserController {
    static login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            // Busca el usuario por email
            const user = await User.findOne({
                where: { email },
                include: [
                    {
                        model: Role,
                        attributes: [
                            "id",
                            "name",
                            "nameDescriptive",
                            "description",
                        ],
                    },
                ],
            });

            if (!user) {
                const error = new Error("El usuario no fue encontrado");
                return res.status(404).json({ errors: error.message });
            }

            if (!user.get("active")) {
                const error = new Error("El usuario ha sido eliminado");
                return res.status(401).json({ errors: error.message });
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
                    role: user.getDataValue("Role"),
                    actions: actions,
                },
            });
        } catch (error) {
            console.error(error);
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

    static createUserWithRole = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "CREATE_USER");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { name, lastname, password, email, role } = req.body;

            // Cambiar la búsqueda de usuario a Sequelize
            const userExists = await User.findOne({ where: { email } });
            if (userExists) {
                const error = new Error("El usuario ya existe");
                return res.status(400).json({ errors: error.message });
            }

            // Cambiar la búsqueda de rol a Sequelize
            const roleUser = await Role.findOne({ where: { name: role } });
            if (!roleUser) {
                const error = new Error("El Rol no fue encontrado");
                return res.status(404).json({ errors: error.message });
            }

            // Crear un nuevo usuario con Sequelize
            const user = await User.create({
                name,
                lastname,
                email,
                password: await hashPassword(password),
                roleId: roleUser.get("id"),
            });

            // Crear un nuevo token con Sequelize
            const token = await Token.create({
                token: generateToken(),
                userId: user.get("id"),
            });

            AuthEmail.sendConfirmationEmail({
                email: user.get("email"),
                name: user.get("name"),
                token: token.get("token"),
            });

            res.send("Usuario Creado Correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static deleteUser = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "DELETE_USER");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { userId } = req.body;

            const user = await User.findByPk(userId);
            if (!user) {
                const error = new Error("El Usuario no fue encontrado");
                return res.status(404).json({ errors: error.message });
            }

            user.set("active", false);
            await user.save();

            res.send("Usuario eliminado correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static activateUser = async (req: CustomRequest, res: Response) => {
        const id = req.user["id"];
        const permissions = await hasPermissions(id, "ACTIVATE_USER");

        if (!permissions) {
            const error = new Error("El Usuario no tiene permisos");
            return res.status(409).json({ errors: error.message });
        }

        const { userId } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            const error = new Error("El Usuario no fue encontrado");
            return res.status(404).json({ errors: error.message });
        }

        if (user.get("active")) {
            const error = new Error("El Usuario ya está activo");
            return res.status(400).json({ errors: error.message });
        }

        user.set("active", true);
        await user.save();

        res.send("Usuario activado correctamente");
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

    static changeRole = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "CHANGE_ROLE");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { role, userId } = req.body;

            const newRole = await Role.findOne({ where: { name: role } });
            if (!newRole) {
                const error = new Error("El rol no existe");
                return res.status(404).json({ errors: error.message });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                const error = new Error("El Usuario no existe");
                return res.status(404).json({ errors: error.message });
            }

            if (String(user.get("roleId")) === String(newRole.get("id"))) {
                const error = new Error("El Usuario ya posee ese rol");
                return res.status(404).json({ errors: error.message });
            }

            user.set("roleId", newRole.get("id"));
            await user.save();

            res.send("El Rol ha sido cambiado exitosamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static editUser = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const hasEditUserPermission = await hasPermissions(id, "EDIT_USER");
            const hasGetProfilePermission = await hasPermissions(
                id,
                "GET_PROFILE"
            );

            if (!hasEditUserPermission && !hasGetProfilePermission) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { userId, name, lastname, password, email, role } = req.body;

            // Cambiar la búsqueda de usuario a Sequelize
            const userEdit = await User.findByPk(userId);
            if (!userEdit) {
                const error = new Error("El Usuario no fue encontrado");
                return res.status(404).json({ errors: error.message });
            }

            userEdit.set("name", name);
            userEdit.set("lastname", lastname);

            if (password) {
                const hashedPassword = await hashPassword(password);
                userEdit.set("password", hashedPassword);
            }

            if (email !== userEdit.get("email")) {
                userEdit.set("email", email);
                userEdit.set("confirmed", false);

                const token = await Token.create({
                    token: generateToken(),
                    userId: userEdit.get("id"),
                });

                AuthEmail.sendConfirmationEmail({
                    email: userEdit.get("email"),
                    name: userEdit.get("name"),
                    token: token.get("token"),
                });
            }

            // Solo permitir cambiar el rol si tiene permiso de EDIT_USER
            if (hasEditUserPermission) {
                const roleUser = await Role.findOne({ where: { name: role } });
                if (!roleUser) {
                    const error = new Error("El Rol no fue encontrado");
                    return res.status(404).json({ errors: error.message });
                }

                if (userEdit.get("roleId") !== roleUser.get("id")) {
                    userEdit.set("roleId", roleUser.get("id"));
                }
            }

            await userEdit.save();

            res.send("Usuario actualizado correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static searchUser = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "GET_USERS");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { search } = req.body;
            const { page = 1, limit = 5 } = req.query;
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 5;
            const offset = (pageNumber - 1) * pageSize;
            const role = (req.query.role as string) || null;

            if (!search) {
                const error = new Error(
                    "Debe proporcionar un término de búsqueda"
                );
                return res.status(400).json({ errors: error.message });
            }

            const query: any = {
                where: {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${search}%` } },
                        { lastname: { [Op.iLike]: `%${search}%` } },
                        { email: { [Op.iLike]: `%${search}%` } },
                    ],
                },
                include: [
                    {
                        model: Role,
                        attributes: ["nameDescriptive"],
                        where: role ? { name: role } : undefined,
                    },
                ],
                attributes: [
                    "id",
                    "name",
                    "lastname",
                    "email",
                    "roleId",
                    "active",
                ],
                offset: offset,
                limit: pageSize,
            };

            const { rows: users, count: totalUsers } =
                await User.findAndCountAll(query);

            res.json({
                users,
                totalPages: Math.ceil(totalUsers / pageSize),
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getAllUsers = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const permissions = await hasPermissions(id, "GET_USERS");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { page = 1, limit = 10 } = req.query;
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 5;
            const offset = (pageNumber - 1) * pageSize;
            const role = (req.query.role as string) || null;

            const query: any = {
                offset: offset,
                limit: pageSize,
                attributes: [
                    "id",
                    "name",
                    "lastname",
                    "email",
                    "roleId",
                    "active",
                ],
                include: [
                    {
                        model: Role,
                        attributes: ["nameDescriptive"],
                        where: role ? { name: role } : undefined,
                    },
                ],
            };

            const { rows: users, count: totalUsers } =
                await User.findAndCountAll(query);

            res.send({
                users,
                totalPages: Math.ceil(totalUsers / pageSize),
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getUser = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const { userId } = req.params;

            const hasGetUsersPermission = await hasPermissions(id, "GET_USERS");
            const hasGetProfilePermission = await hasPermissions(
                id,
                "GET_PROFILE"
            );

            if (!hasGetUsersPermission && !hasGetProfilePermission) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const user = await User.findByPk(userId, {
                attributes: hasGetUsersPermission
                    ? { exclude: ["password", "createdAt", "updatedAt"] }
                    : ["name", "lastname", "email"],
                include: hasGetUsersPermission
                    ? {
                          model: Role,
                          attributes: ["name"],
                      }
                    : undefined,
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
}
