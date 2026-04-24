import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as fs from "fs";
import { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";

async function bootstrap() {
  let httpsOptions: HttpsOptions | undefined;
  if (process.env.NODE_ENV === "development") {
    httpsOptions = undefined;
  } else {
    httpsOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
  }

  const app = await NestFactory.create(AppModule, { httpsOptions });

  app.setGlobalPrefix("api");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // For MUI
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // For PWA
  }));
  const corsOrigin = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map((s) => s.trim())
    : process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL]
      : true;
  app.enableCors({
    origin: corsOrigin,
    methods: "GET,HEAD,PUT,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(
    pinoHttp({
      logger: pino({ level: process.env.NODE_ENV === "development" ? "debug" : "info" }),
      customProps: () => ({ context: "http" }),
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          query: req.query,
          body: req.body,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    }),
  );

  await app.listen(process.env.PORT);
}
bootstrap();
