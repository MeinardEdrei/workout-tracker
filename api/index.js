const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const splitsRouter = require("./routes/splits");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/splits", splitsRouter);
app.get("/health", (_req, res) => res.json({ status: "ok" }));

if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    app.listen(process.env.PORT || 3001, () => console.log("Server running"));
  });
}

module.exports = app;
