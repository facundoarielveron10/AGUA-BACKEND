import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { corsConfig } from "./config/cors";
import { connectDB } from "./config/database";
import UserRoutes from "./routes/UserRoutes";
import RoleActionRoutes from "./routes/RoleActionRoutes";

dotenv.config();

connectDB();

const app = express();

app.use(cors(corsConfig));
app.use(express.json());

// ROUTES
app.use("/api/user", UserRoutes);
app.use("/api/role-action", RoleActionRoutes);

export default app;
