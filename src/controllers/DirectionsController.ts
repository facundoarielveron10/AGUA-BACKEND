import type { Response } from "express";
import { Address } from "../models/Address";
import { CustomRequest } from "../middleware/authenticate";
import { hasPermissions } from "../utils/auth";
import { User } from "../models/User";

export class DirectionsController {
    static createAddress = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "CREATE_ADDRESS");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { address, city, country, userId } = req.body;

            const addressExists = await Address.findAll({
                where: { userId },
            });

            if (addressExists.length >= 3) {
                const error = new Error("El Usuario ya tiene 3 direcciones");
                return res.status(409).json({ errors: error.message });
            }

            const newAddress = new Address({ address, city, country, userId });
            await newAddress.save();

            res.send({
                message: "Dirección Creada Correctamente",
                newAddress,
            });
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static editAddress = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "EDIT_ADDRESS");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { address, city, country, directionId } = req.body;

            const updatedAddress = await Address.findByPk(directionId);
            if (!updatedAddress) {
                const error = new Error("La Dirección no existe");
                return res.status(409).json({ errors: error.message });
            }

            await updatedAddress.update({ address, city, country });

            res.send({
                message: "Dirección Actualizada Correctamente",
                updatedAddress,
            });
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static deleteAddress = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "EDIT_ADDRESS");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { directionId } = req.body;

            const address = await Address.findByPk(directionId);
            if (!address) {
                const error = new Error("La Dirección no existe");
                return res.status(409).json({ errors: error.message });
            }

            await address.destroy();

            res.send("Dirección Eliminada Correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getAddress = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "GET_ADDRESS");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { userId } = req.params;

            const user = await User.findByPk(userId);
            if (!user) {
                const error = new Error("El Usuario no existe");
                return res.status(409).json({ errors: error.message });
            }

            const address = await Address.findAll({
                where: { userId },
                attributes: ["id", "address", "city", "country"],
            });

            res.send(address);
        } catch (error) {
            console.log(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };
}
