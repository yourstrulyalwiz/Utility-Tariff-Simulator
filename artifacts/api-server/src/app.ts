import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);
app.use((req,res,next)=>{
  if (!["GET","HEAD","OPTIONS"].includes(req.method) && req.headers["sec-fetch-site"]==="cross-site") {
    res.status(403).json({error:"Cross-site writes are not allowed"});return;
  }
  next();
});

app.use("/api", router);

export default app;
