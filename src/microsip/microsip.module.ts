import { Module } from '@nestjs/common';
import { SocketController } from './socket/socket.controller';
import { SocketModule } from 'src/socket/socket.module';
import { SockeEventsService } from './socke-events/socke-events.service';
import { HttpAxiosModule } from 'src/http-axios/http-axios.module';
import { LoggerModule } from 'src/logger/logger.module';
import { ScheduleModule  } from '@nestjs/schedule';
import { EntregadoEstatusService } from './entregado-estatus/entregado-estatus.service';
import { KnexconnectionModule } from 'src/knexconnection/knexconnection.module';

@Module({
  controllers: [SocketController],
  imports: [SocketModule, HttpAxiosModule, LoggerModule, ScheduleModule.forRoot(), KnexconnectionModule],
  providers: [SockeEventsService, EntregadoEstatusService],
})
export class MicrosipModule {}
