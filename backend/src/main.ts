import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

async function bootstrap() {

  let httpsOptions: HttpsOptions | undefined;
  if (process.env.NODE_ENV === 'development') {
    httpsOptions = undefined;
  } else {
    httpsOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
  }

    const app = await NestFactory.create(AppModule, { httpsOptions});

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Enable CORS
    app.enableCors({
      origin: process.env.NODE_ENV === 'development' 
        ? true 
        : process.env.FRONTEND_URL,
      methods: 'GET,HEAD,PUT,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // Enable global validation
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    }));


    await app.listen(process.env.PORT); // Or 8443 if not running as root
}
bootstrap();
