import { Sequelize } from "sequelize";
import colors from "colors";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(colors.magenta.bold("- PostgreSQL Conectado -"));

        await sequelize.sync({ alter: true });

        console.log(
            colors.green.bold("Modelos sincronizados con la base de datos")
        );
    } catch (error) {
        console.error(
            colors.red.bold("¡ERROR: Fallo en la conexión con PostgreSQL!"),
            error
        );
        process.exit(1);
    }
};
