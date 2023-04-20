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
      let HOST_DB_PROD: string;
      let USER_DB_PROD: string;
      let PASSWORD_DB_PROD: string;
      let DATABASE_DB_PROD:string;

      //VALIDACION DE VARIABLES DE ENTORNO DEL ENV
      HOST_DB_PROD = process.env.ENVIRONMENT == "produccion" ? process.env.HOST_DB_PROD : process.env.HOST_DB_DEV;
      USER_DB_PROD = process.env.ENVIRONMENT == "produccion" ? process.env.USER_DB_PROD : process.env.USER_DB_DEV;
      PASSWORD_DB_PROD = process.env.ENVIRONMENT == "produccion" ? process.env.PASSWORD_DB_PROD : process.env.PASSWORD_DB_DEV;
      DATABASE_DB_PROD = process.env.ENVIRONMENT == "produccion" ? process.env.DATABASE_DB_PROD : process.env.DATABASE_DB_DEV;

        const knex = require('knex')({
            client: 'mysql',
            connection: {
              host : HOST_DB_PROD,
              port : 3306,
              user : USER_DB_PROD,
              password : PASSWORD_DB_PROD,
              database : DATABASE_DB_PROD
            }
          });
        this.logger.log('info','knex conn: '+DATABASE_DB_PROD+ ' ENVIRONMENT: '+process.env.ENVIRONMENT)
        return knex.from(table)
    }
}
