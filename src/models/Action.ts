import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Action extends Model {
    public id!: number;
    public name!: string;
    public description!: string;
    public type!: string;
}

Action.init(
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "Action",
    }
);
