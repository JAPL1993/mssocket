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
              host : process.env.ENV == "produccion" ? process.env.HOST_DB_PROD : process.env.HOST_DB_DEV,
              port : 3306,
              user : process.env.ENV == "produccion" ? process.env.USER_DB_PROD : process.env.USER_DB_DEV,
              password : process.env.ENV == "produccion" ? process.env.PASSWORD_DB_PROD : process.env.PASSWORD_DB_DEV,
              database : process.env.ENV == "produccion" ? process.env.DATABASE_DB_PROD : process.env.DATABASE_DB_DEV
            }
          });
        this.logger.log('info','knex conn')
        return knex.from(table)
    }
}
