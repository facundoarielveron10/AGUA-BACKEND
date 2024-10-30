import type { Response } from "express";
import { Action } from "../models/Action";
import { Role } from "../models/Role";
import { RoleAction } from "../models/RoleAction";
import { hasPermissions, roleUser } from "../utils/auth";
import { CustomRequest } from "../middleware/authenticate";
import { User } from "../models/User";
import { Op } from "sequelize";

export class RoleActionController {
    static getAllRoles = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const permissions = await hasPermissions(id, "GET_ROLES");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const roles = await Role.findAll();
            res.send(roles);
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getRoleActions = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const { idRole } = req.params;

            const permissions = await hasPermissions(id, "EDIT_ROLE");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const role = await Role.findByPk(idRole);
            if (!role) {
                const error = new Error("El rol no ha sido encontrado");
                return res.status(404).json({ errors: error.message });
            }

            const actions = await RoleAction.findAll({
                where: { roleId: idRole },
                include: [
                    {
                        model: Action,
                        attributes: ["name"],
                    },
                ],
            });

            res.send({
                role,
                actions,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getAllActions = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const permissions = await hasPermissions(id, "GET_ACTIONS");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { page = 1, limit = 5, type } = req.query;
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 5;
            const offset = (pageNumber - 1) * pageSize;

            const where = type ? { type } : {};

            const { rows: actions, count: totalActions } =
                await Action.findAndCountAll({
                    where,
                    offset,
                    limit: pageSize,
                    order: [["id", "ASC"]],
                    distinct: true,
                });

            res.json({
                actions,
                totalPages: Math.ceil(totalActions / pageSize),
            });
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static createRole = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const permissions = await hasPermissions(id, "CREATE_ROLE");

            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { name, nameDescriptive, description, actions } = req.body;

            const actionsData = await Action.findAll({
                where: {
                    name: actions,
                },
            });

            if (actionsData.length !== actions.length) {
                const error = new Error(
                    "Una o más acciones no existen en la base de datos"
                );
                return res.status(400).json({ errors: error.message });
            }

            const roleExist = await Role.findOne({
                where: { name: name },
            });

            if (roleExist) {
                const error = new Error("El rol ya existe");
                return res.status(400).json({ errors: error.message });
            }

            const newRole = await Role.create({
                name,
                nameDescriptive,
                description,
            });

            const roleActions = actionsData.map((action) => ({
                roleId: newRole.get("id"),
                actionId: action.get("id"),
            }));

            await RoleAction.bulkCreate(roleActions);

            res.send("Rol creado correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static editRole = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const {
                idRole,
                newName,
                newNameDescriptive,
                newDescription,
                newActions,
            } = req.body;

            const permissions = await hasPermissions(id, "EDIT_ROLE");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const role = await Role.findByPk(idRole);
            if (!role) {
                const error = new Error("El Rol no existe");
                return res.status(404).json({ errors: error.message });
            }

            role.set("name", newName);
            role.set("nameDescriptive", newNameDescriptive);
            role.set("description", newDescription);

            await role.save();

            await RoleAction.destroy({ where: { roleId: idRole } });

            const actionIds = await Action.findAll({
                where: {
                    name: {
                        [Op.in]: newActions,
                    },
                },
            });

            if (actionIds.length !== newActions.length) {
                const error = new Error("Una o más acciones no existen");
                return res.status(400).json({ errors: error.message });
            }

            const roleActions = actionIds.map((action) => ({
                roleId: idRole,
                actionId: action.get("id"),
            }));

            await RoleAction.bulkCreate(roleActions);

            res.send("Rol actualizado correctamente");
        } catch (error) {
            console.log(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static deleteRole = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const { idRole } = req.body;

            const permissions = await hasPermissions(id, "DELETE_ROLE");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const role = await Role.findByPk(idRole);

            if (!role) {
                const error = new Error("El Rol no existe");
                return res.status(404).json({ errors: error.message });
            }

            if (
                role.get("name") === "ROLE_ADMIN" ||
                role.get("name") === "ROLE_USER"
            ) {
                const error = new Error(
                    "No puedes eliminar el rol de Usuarios o el de Administrador"
                );
                return res.status(400).json({ errors: error.message });
            }

            const users = await User.findAll({ where: { roleId: idRole } });
            const newRole = await roleUser();

            await Promise.all(
                users.map(async (user) => {
                    user.set("roleId", newRole);
                    await user.save();
                })
            );

            role.set("active", false);
            await role.save();

            res.send("Rol eliminado correctamente");
        } catch (error) {
            console.log(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static activeRole = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const { idRole } = req.body;

            const permissions = await hasPermissions(id, "ACTIVE_ROLE");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const role = await Role.findByPk(idRole);

            if (!role) {
                const error = new Error("El Rol no existe");
                return res.status(404).json({ errors: error.message });
            }

            if (role.get("active")) {
                const error = new Error("El Rol no ha sido eliminado");
                return res.status(403).json({ errors: error.message });
            }

            role.set("active", true);
            await role.save();

            res.send("Rol activado correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };
}
