import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { cyberPuertaController } from './cyber-puerta.controller';
import { CyberPuertaService } from './cyber-puerta.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { HttpAxiosService } from 'src/http-axios/http-axios/http-axios.service';
import { SocketService } from 'src/socket/socket/socket.service';
import { HttpService } from '@nestjs/axios';
import { HttpAxiosModule } from 'src/http-axios/http-axios.module';
import { SocketModule } from 'src/socket/socket.module';
@Module({
imports:[

],
controllers: [cyberPuertaController],
providers: [CyberPuertaService]
})
export class CyberpuertaModule{}