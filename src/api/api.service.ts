import { Injectable, Inject } from '@nestjs/common';
import { HttpAxiosService } from 'src/http-axios/http-axios/http-axios.service';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';
@Injectable()
export class ApiService {
    private logger: Logger
    constructor(
        @Inject(LoggerService) loggerService : LoggerService,
        @Inject(KnexconnectionService) private readonly knexConn : KnexconnectionService,
        @Inject(HttpAxiosService) private readonly axios: HttpAxiosService
    ){}

    async createClientsMS(){
        /* const dataRequestC = {
            request_token:'1234',
        };
        await this.axios.postMicrosip("endpoint", dataRequestC)
        await this.axios.postNode("", {"data": "data"}) */
    }
}
