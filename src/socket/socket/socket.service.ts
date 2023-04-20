import { Inject, Injectable } from '@nestjs/common';
import * as io from 'socket.io-client';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';

@Injectable()
export class SocketService {
  public socket: io.Socket;
  private logger: Logger;
  constructor(@Inject(LoggerService) loggerService: LoggerService) {
    this.logger = loggerService.wLogger({
      logName: 'SocketService',
      level: 'info',
    });
    this.logger.info('Connecting to socket server...');
    this.socket = io.connect(process.env.SOCKET_SERVERMS_DEV);
    this.socket.on('connect', () =>
      this.logger.log('info', 'The conection has been successfuly stablished', {
        data: 'excelente',
      }),
    );
  }
}
