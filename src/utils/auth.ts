import bcrypt from "bcrypt";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { RoleAction } from "../models/RoleAction";
import { Action } from "../models/Action";
import jwt from "jsonwebtoken";

// Función para hashear el password usando bcrypt
export const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Función para comparar el password ingresado con el almacenado
export const checkPassword = async (password: string, storedHash: string) => {
    return await bcrypt.compare(password, storedHash);
};

// Función para verificar permisos del usuario en base a su rol y la acción específica
export const hasPermissions = async (id: number, action: string) => {
    // Obtener usuario por ID
    const user = await User.findByPk(id, {
        include: [Role],
    });

    if (!user) {
        throw new Error("El Usuario no ha sido encontrado");
    }

    const roleId = user.get("roleId");
    const role = await Role.findByPk(roleId);

    if (!role) {
        throw new Error("El Rol del Usuario no ha sido encontrado");
    }

    // Consultar las acciones asociadas al rol
    const roleActions = await RoleAction.findAll({
        where: { roleId: role.get("id") },
        include: [
            {
                model: Action,
                attributes: ["name"],
            },
        ],
    });

    // Comprobar si el rol tiene la acción especificada
    const hasPermission = roleActions.some((roleAction) => {
        const actionInstance = roleAction.get("Action") as Action;
        return actionInstance.get("name") === action;
    });

    return hasPermission;
};

// Función para obtener el ID del rol de usuario
export const roleUser = async () => {
    const role = await Role.findOne({ where: { name: "ROLE_USER" } });
    if (!role) throw new Error("No se encontró el rol de usuario");
    return role.get("id"); // Verifica que esto retorne un valor válido
};

// Función para obtener el ID del rol de administrador
export const roleAdmin = async () => {
    const role = await Role.findOne({ where: { name: "ROLE_ADMIN" } });
    if (!role) throw new Error("No se encontró el rol de administrador");
    return role.id;
};

// Función para decodificar y verificar el token JWT
export const idUser = (token: string) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("No se ha configurado la clave secreta JWT");
    }

    try {
        const decoded = jwt.verify(token, secret) as { id: number };
        return decoded.id;
    } catch (err) {
        console.error("Error al verificar/decodificar el token:", err.message);
        throw new Error("Token no válido");
    }
};
