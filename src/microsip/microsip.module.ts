import { Module } from '@nestjs/common';
import { SocketController } from './socket/socket.controller';
import { SocketModule } from 'src/socket/socket.module';
import { SockeEventsService } from './socke-events/socke-events.service';
import { HttpAxiosModule } from 'src/http-axios/http-axios.module';

@Module({
  controllers: [SocketController],
  imports: [SocketModule, HttpAxiosModule],
  providers: [SockeEventsService],
})
export class MicrosipModule {}
