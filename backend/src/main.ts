import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as fs from "fs";
import { HttpsOptions } from "@nestjs/common/interfaces/external/https-options.interface";
import helmet from "helmet";

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
  app.enableCors({
    origin:
      process.env.NODE_ENV === "development" ? true : process.env.FRONTEND_URL,
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

  await app.listen(process.env.PORT);
}
bootstrap();
