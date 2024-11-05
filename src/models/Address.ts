import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";

export class Address extends Model {
    public id!: number;
    public address!: string;
    public province!: string;
    public country!: string;
    public userId!: number;
}

Address.init(
    {
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        country: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            references: {
                model: User,
                key: "id",
            },
        },
    },
    {
        sequelize,
        modelName: "Address",
    }
);

Address.belongsTo(User, { foreignKey: "userId" });
