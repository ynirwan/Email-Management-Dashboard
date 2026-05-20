import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import adminUsageRouter from "./routes/admin-usage.js";


const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api/admin/usage", adminUsageRouter);


export default app;
