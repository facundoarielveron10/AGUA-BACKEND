import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";

export class Role extends Model {
    public id!: number;
    public name!: string;
    public nameDescriptive!: string;
    public description!: string;
    public active!: boolean;
}

Role.init(
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        nameDescriptive: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: "Role",
    }
);
