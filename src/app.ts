import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser"

const app: Application = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Routes import
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";

// Route declractions
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);

app.get("/", (req, res) => {
  res.send("Server is running... on localhost:8080");
});

export default app;
