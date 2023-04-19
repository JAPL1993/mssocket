import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';

@Injectable()
export class KnexconnectionService {
    private logger : Logger
    constructor(@Inject(LoggerService) loggerService: LoggerService) {
        this.logger = loggerService.wLogger({logName: 'DataBase Connection', level:'info'})
        this.logger.log('info','Se creo el constructor')
    }
    knexQuery(table : string){
        const knex = require('knex')({
            client: 'mysql',
            connection: {
              host : 'vps-300684.compufax.com.mx',
              port : 3306,
              user : 'faguiar_back_laravel',
              password : 'compufax_back',
              database : 'faguiar_back_laravel_compras'
            }
          });
        this.logger.log('info','knex conn')
        return knex.from(table)
    }
}
