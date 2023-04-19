import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { MicrosipModule } from './microsip/microsip.module';
import { SocketModule } from './socket/socket.module';
import { HttpAxiosModule } from './http-axios/http-axios.module';
import { LoggerModule } from './logger/logger.module';
import { KnexconnectionModule } from './knexconnection/knexconnection.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
    ConfigModule.forRoot(),
    MicrosipModule,
    SocketModule,
    HttpAxiosModule,
    LoggerModule,
    KnexconnectionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
