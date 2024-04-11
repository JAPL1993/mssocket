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
    ){
        this.logger = loggerService.wLogger({logName: 'Cronjob', level: 'info'})
    }

    async createClientsMS(){
        this.logger.info('inicio createOrUpdate Clientes Cronjob')
        const dataRequestC = {
            request_token:'1234',
        };
        const customer = await this.axios.postMicrosip("Customer/updateOrCreateCustomer", dataRequestC)
        console.log(customer.data)
        if(customer.data == ""){
            this.logger.info('createOrUpdate Clientes Cronjob->nada que actualizar/crear')
        }else{
            this.logger.info('createOrUpdate Clientes Cronjob->Actualizando')
            const responseNode = await this.axios.postNode("api/microsip/updateOrCreateCustomer", {"clientes": customer.data})
            //console.log(responseNode)
            this.logger.info("createOrUpdate Clientes Cronjob response "+responseNode.status)
        }
        this.logger.info('termino el createOrUpdate Clientes Cronjob')
    }
}
