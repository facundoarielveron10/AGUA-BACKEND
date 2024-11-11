import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";
import { Address } from "./Address";
import { User } from "./User";

export class Order extends Model {
    public id!: number;
    public amount!: number;
    public totalPrice!: number;
    public status!: string;
    public addressId!: number;
    public userId!: number;
    public deliveryId!: number;
}

Order.init(
    {
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        totalPrice: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        addressId: {
            type: DataTypes.INTEGER,
            references: {
                model: Address,
                key: "id",
            },
        },
        userId: {
            type: DataTypes.INTEGER,
            references: {
                model: User,
                key: "id",
            },
        },
        deliveryId: {
            type: DataTypes.INTEGER,
            references: {
                model: User,
                key: "id",
            },
        },
    },
    {
        sequelize,
        modelName: "Order",
    }
);

Order.belongsTo(Address, { foreignKey: "addressId" });
Order.belongsTo(User, { as: "User", foreignKey: "userId" });
Order.belongsTo(User, { as: "Delivery", foreignKey: "deliveryId" });
