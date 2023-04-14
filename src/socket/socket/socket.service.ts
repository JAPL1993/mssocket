import { Injectable } from '@nestjs/common';
import * as io from 'socket.io-client';

@Injectable()
export class SocketService {
  public socket: io.Socket;
  constructor() {
    this.socket = io.connect('http://162.214.164.60:8085/microsip');
    this.socket.on('connect', () => console.log('conection successfuly'));
  }
}
