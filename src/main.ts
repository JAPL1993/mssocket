import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
  });
  await app.setGlobalPrefix('api', {exclude:[
    {path: '', method: RequestMethod.GET}
  ]}).listen(3000);
}
bootstrap();
