import type { Response } from "express";
import { CustomRequest } from "../middleware/authenticate";
import { hasPermissions } from "../utils/auth";
import { Address } from "../models/Address";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { Role } from "../models/Role";

export class OrdersController {
    static createOrder = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "CREATE_ORDER");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { amount, totalPrice, addressId, userId } = req.body;

            const address = await Address.findByPk(addressId);
            if (!address) {
                const error = new Error("La Dirección no existe");
                return res.status(409).json({ errors: error.message });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                const error = new Error("El Usuario no existe");
                return res.status(409).json({ errors: error.message });
            }

            await Order.create({
                amount,
                totalPrice,
                status: "PENDING",
                addressId,
                userId,
            });

            res.send("Orden Creada Correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static cancelOrder = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "CANCEL_ORDER");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { orderId } = req.body;

            const order = await Order.findByPk(orderId);
            if (!order) {
                const error = new Error("La Orden no existe");
                return res.status(409).json({ errors: error.message });
            }

            if (order.get("status") !== "PENDING") {
                const error = new Error("La Orden no puede ser cancelada");
                return res.status(409).json({ errors: error.message });
            }

            await order.update({ status: "CANCELLED" });

            res.send("Orden Cancelada Correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static confirmOrder = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "CONFIRM_ORDER");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { orderId } = req.body;

            const order = await Order.findByPk(orderId);
            if (!order) {
                const error = new Error("La Orden no existe");
                return res.status(409).json({ errors: error.message });
            }

            if (order.get("status") !== "PENDING") {
                const error = new Error("La Orden no puede ser confirmada");
                return res.status(409).json({ errors: error.message });
            }

            await order.update({ status: "CONFIRMED" });

            res.send("Orden Confirmada Correctamente");
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getAllOrders = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "GET_ORDERS");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { page = 1, limit = 10, status } = req.query;
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 10;
            const offset = (pageNumber - 1) * pageSize;

            const whereConditions: any = {};

            if (status) {
                whereConditions.status = status;
            }

            const { rows: orders, count: totalOrders } =
                await Order.findAndCountAll({
                    where: whereConditions,
                    attributes: [
                        "id",
                        "amount",
                        "totalPrice",
                        "status",
                        "createdAt",
                    ],
                    include: [
                        {
                            model: Address,
                            attributes: ["address", "city", "country"],
                        },
                        {
                            model: User,
                            attributes: ["id", "name", "lastname", "email"],
                        },
                    ],
                    offset: offset,
                    limit: pageSize,
                    order: [["createdAt", "DESC"]],
                });

            res.send({
                orders,
                totalPages: Math.ceil(totalOrders / pageSize),
            });
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getOrdersByUser = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "GET_ORDERS_USER");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const userId = req.params.userId;
            const user = await User.findByPk(userId);
            if (!user) {
                const error = new Error("El Usuario no existe");
                return res.status(409).json({ errors: error.message });
            }

            const { page = 1, limit = 10, status } = req.query;
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 10;
            const offset = (pageNumber - 1) * pageSize;

            const whereConditions: any = {
                userId: user.get("id"),
            };

            if (status) {
                whereConditions.status = status;
            }

            const { rows: orders, count: totalOrders } =
                await Order.findAndCountAll({
                    where: whereConditions,
                    attributes: [
                        "id",
                        "amount",
                        "totalPrice",
                        "status",
                        "createdAt",
                    ],
                    include: [
                        {
                            model: Address,
                            attributes: ["address", "city", "country"],
                        },
                    ],
                    offset: offset,
                    limit: pageSize,
                    order: [["createdAt", "DESC"]],
                });

            res.send({
                orders,
                totalPages: Math.ceil(totalOrders / pageSize),
            });
        } catch (error) {
            res.status(500).json({ errors: "Hubo un error" });
        }
    };

    static getAllDeliveries = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "GET_DELIVERIES");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const roleDelivery = await Role.findOne({
                where: { name: "ROLE_DELIVERY" },
            });

            const deliveries = await User.findAll({
                where: { roleId: roleDelivery?.get("id") },
                attributes: ["id", "name", "lastname"],
            });

            res.send(deliveries);
        } catch (error) {
            console.log(error);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };
}
