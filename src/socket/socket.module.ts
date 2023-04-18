import { Module } from '@nestjs/common';
import { SocketService } from './socket/socket.service';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [SocketService],
  exports: [SocketService],
})
export class SocketModule {}
