import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod } from '@nestjs/common';
import * as fs from 'fs';
async function bootstrap() {
  /* const httpsOptions = {
    key: fs.readFileSync("ssl/private_key.key", 'utf8'),
    cert: fs.readFileSync("ssl/certicate.crt", "utf8"),
    ca: fs.readFileSync('ssl/certificate_ca.crt', "utf8")
  } */
  const app = await NestFactory.create(
    AppModule, 
  {
    snapshot: true,
  });
  /* httpsOptions */
  await app.listen(3000);
}
bootstrap();
