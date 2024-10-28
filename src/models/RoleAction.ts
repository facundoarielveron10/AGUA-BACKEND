import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database";
import { Role } from "./Role";
import { Action } from "./Action";

export class RoleAction extends Model {
    public id!: number;
    public roleId!: number;
    public actionId!: number;
}

RoleAction.init(
    {
        roleId: {
            type: DataTypes.INTEGER,
            references: {
                model: Role,
                key: "id",
            },
        },
        actionId: {
            type: DataTypes.INTEGER,
            references: {
                model: Action,
                key: "id",
            },
        },
    },
    {
        sequelize,
        modelName: "RoleAction",
    }
);

RoleAction.belongsTo(Role, { foreignKey: "roleId" });
RoleAction.belongsTo(Action, { foreignKey: "actionId" });
