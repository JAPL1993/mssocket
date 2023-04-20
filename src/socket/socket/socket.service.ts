import { Inject, Injectable } from '@nestjs/common';
import * as io from 'socket.io-client';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';

@Injectable()
export class SocketService {
  public socket: io.Socket;
  private logger: Logger;
  constructor(@Inject(LoggerService) loggerService: LoggerService) {
    let SOCKET_SERVER_URL:string;

    //VALIDAMOS LAS VARIABLES DE ENTORNO DEL ENV
    SOCKET_SERVER_URL = process.env.ENVIRONMENT == 'produccion' ? process.env.SOCKET_SERVER_PROD : process.env.SOCKET_SERVER_DEV

    this.logger = loggerService.wLogger({
      logName: 'SocketService',
      level: 'info',
    });
    this.logger.info('Connecting to socket server... ENVIRONMENT: '+process.env.ENVIRONMENT+ ' URL: '+SOCKET_SERVER_URL);
    this.socket = io.connect(SOCKET_SERVER_URL);
    this.socket.on('connect', () =>
      this.logger.log('info', 'The conection has been successfuly stablished ENVIRONMENT: '+process.env.ENVIRONMENT+ ' URL: '+SOCKET_SERVER_URL, {
        data: 'excelente',
      }),
    );
  }
}
