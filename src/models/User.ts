import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";
import { Role } from "./Role";

export class User extends Model {
    public id!: number;
    public name!: string;
    public lastname!: string;
    public email!: string;
    public password!: string;
    public confirmed!: boolean;
    public roleId!: number;
    public active!: boolean;
}

User.init(
    {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastname: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        confirmed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        roleId: {
            type: DataTypes.INTEGER,
            references: {
                model: Role,
                key: "id",
            },
        },
    },
    {
        sequelize,
        modelName: "User",
        timestamps: true,
    }
);

User.belongsTo(Role, { foreignKey: "roleId" });
