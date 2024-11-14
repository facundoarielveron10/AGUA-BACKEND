import type { Response } from "express";
import { CustomRequest } from "../middleware/authenticate";
import { hasPermissions } from "../utils/auth";
import { Address } from "../models/Address";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { Role } from "../models/Role";
import { Op } from "sequelize";
import axios from "axios";

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

    static assingDelivery = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "ASSING_DELIVERY");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { orderId, deliveryId } = req.body;

            const order = await Order.findByPk(orderId);
            if (!order) {
                const error = new Error("La Orden no existe");
                return res.status(409).json({ errors: error.message });
            }

            const delivery = await User.findByPk(deliveryId);
            if (!delivery) {
                const error = new Error("El Repartidor no existe");
                return res.status(409).json({ errors: error.message });
            }

            const roleDelivery = await Role.findOne({
                where: { name: "ROLE_DELIVERY" },
            });
            if (delivery.get("roleId") !== roleDelivery?.get("id")) {
                const error = new Error("El Repartidor no es valido");
                return res.status(409).json({ errors: error.message });
            }

            if (order.get("status") !== "CONFIRMED") {
                const error = new Error("La Orden no puede ser asignada");
                return res.status(409).json({ errors: error.message });
            }

            await order.update({ deliveryId, status: "WAITING" });

            res.send("Orden Asignada Correctamente");
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
                            as: "User",
                        },
                        {
                            model: User,
                            attributes: ["id", "name", "lastname", "email"],
                            as: "Delivery",
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

    static getOrdersByDelivery = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];

            const permissions = await hasPermissions(id, "GET_ORDERS_DELIVERY");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const deliveryId = req.params.deliveryId;
            const delivery = await User.findByPk(deliveryId);
            if (!delivery) {
                const error = new Error("El Usuario no existe");
                return res.status(409).json({ errors: error.message });
            }

            const {
                page = 1,
                limit = 10,
                status,
                date,
                startDate,
                endDate,
            } = req.query;
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 10;
            const offset = (pageNumber - 1) * pageSize;

            const whereConditions: any = {
                deliveryId: delivery.get("id"),
            };

            if (status) {
                whereConditions.status = status;
            }

            // Verificar y construir condiciones de fecha
            if (date && !isNaN(Date.parse(date as string))) {
                const parsedDate = new Date(date as string);
                whereConditions.createdAt = {
                    [Op.gte]: new Date(parsedDate.setHours(0, 0, 0, 0)),
                    [Op.lt]: new Date(parsedDate.setHours(24, 0, 0, 0)),
                };
            } else if (
                startDate &&
                endDate &&
                !isNaN(Date.parse(startDate as string)) &&
                !isNaN(Date.parse(endDate as string))
            ) {
                whereConditions.createdAt = {
                    [Op.gte]: new Date(startDate as string),
                    [Op.lt]: new Date(
                        new Date(endDate as string).setHours(24, 0, 0, 0)
                    ),
                };
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
                            attributes: [
                                "id",
                                "address",
                                "city",
                                "country",
                                "coordinates",
                            ],
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

    static generateRoute = async (req: CustomRequest, res: Response) => {
        try {
            const id = req.user["id"];
            const permissions = await hasPermissions(id, "GENERATE_ROUTE");
            if (!permissions) {
                const error = new Error("El Usuario no tiene permisos");
                return res.status(409).json({ errors: error.message });
            }

            const { orders } = req.body;

            const apiKeyORS =
                "5b3ce3597851110001cf6248c077885edb3449d5b509fbdf94ba203e";

            const coordinatesData = await orders.map((order) => {
                return order.coordinates.map((coord) =>
                    parseFloat(parseFloat(coord).toFixed(7))
                );
            });

            const { data } = await axios.post(
                "https://api.openrouteservice.org/v2/directions/driving-car/json",
                {
                    coordinates: coordinatesData,
                },
                {
                    headers: {
                        Accept: "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
                        Authorization: apiKeyORS,
                        "Content-Type": "application/json; charset=utf-8",
                    },
                }
            );

            res.send(data);
        } catch (error) {
            console.log(error.response.data);
            res.status(500).json({ errors: "Hubo un error" });
        }
    };
}
