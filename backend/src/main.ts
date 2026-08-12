import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as fs from "fs";
import { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";

async function bootstrap() {
  // ⚠️ TLS is now opt-in by CONFIG, not by NODE_ENV.
  //
  // It used to key off `NODE_ENV === "development"`, which meant production was supposed
  // to terminate TLS here — except the live box runs NODE_ENV=development, so the branch
  // never executed and it has been serving plain HTTP all along.
  //
  // Behind Traefik the app should serve HTTP: Traefik terminates TLS and forwards over the
  // container network. Setting NODE_ENV=production with the old logic would have crashed
  // on a missing cert file. Keying off the paths keeps the capability for anyone running
  // it standalone, and does the right thing in a container where they are unset.
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;
  const httpsOptions: HttpsOptions | undefined =
    sslKeyPath && sslCertPath
      ? {
          key: fs.readFileSync(sslKeyPath),
          cert: fs.readFileSync(sslCertPath),
        }
      : undefined;

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

  // 0.0.0.0: localhost-only is unreachable from outside a container.
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}
bootstrap();
