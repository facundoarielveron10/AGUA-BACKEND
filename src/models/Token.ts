import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";

export class Token extends Model {
    public id!: number;
    public token!: string;
    public userId!: number;
    public createdAt!: Date;
}

Token.init(
    {
        token: {
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
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: "Token",
        timestamps: true,
    }
);

Token.belongsTo(User, { foreignKey: "userId" });
