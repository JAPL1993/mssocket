import { Inject, Injectable } from '@nestjs/common';
import fs = require('fs');
import path = require('path');
import { Cron } from '@nestjs/schedule';
import {SocketService} from 'src/socket/socket/socket.service';
import { HttpAxiosService } from 'src/http-axios/http-axios/http-axios.service';
import { dir } from 'console';
import { rejects } from 'assert';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';

@Injectable()
export class MicrosipReportsService {
    private stackData = [];
    private dataIsProccesing = false;
    private logger: Logger;
    constructor(
        @Inject(SocketService) private readonly socket: SocketService,
        @Inject(HttpAxiosService) private readonly httpAxios: HttpAxiosService,
        @Inject(LoggerService) loggerService: LoggerService,
    ){
        this.dataIsProccesing = false;
        this.stackData = [];
        this.logger = loggerService.wLogger({ logName: 'ReportCommissions', level: 'info' });

        /**Objeto que cuenta con el 
         * nombre de los eventos que 
         * se van a captar.
         */
        const handlers = {
            CreateReport:(data:any)=>{
                this.stackData.push(data);
                if(!this.dataIsProccesing){
                    this.processReport();
                }
            }
        }

        Object.keys(handlers).forEach((eventName) => {
            const handler = handlers[eventName];
            socket.socket.on(eventName, (data: any) => handler(data));
          });
    }

    private async processReport(){
        this.dataIsProccesing = true;
        while(this.stackData.length > 0){
            const data = this.stackData.shift();
            await this.handlerReport(data,this.httpAxios);
        }
        this.dataIsProccesing = false;
    }

    //Control del evento
    handlerReport = async(data:any,httpA:HttpAxiosService)=>{
        try {
            //CODIGO
            const resData = await this.sendReport(data,httpA);
        } catch (error) {
            console.log(error);
            this.socket.socket.emit('returnReportError',{
                id_user:data.id_user,
                error_msg:'Error al generar reporte de comisiones'
            })
        }
    }
    //@Cron('59 * * * * *')
    async sendReport(data:any,objHttp:HttpAxiosService):Promise<any>{
        const dir_report = await objHttp.postMicrosip('Reporte/ReportCommission',{
            request_token:"1234",
            fechaInicio:data.fechaInicio,
            fechaFinal:data.fechaFinal,
            vendedor:""
        });
        console.log(dir_report.data.msg);
        if(dir_report.data.status == "400"){
            this.logger.error('Error al generar el reporte de comisiones',dir_report.data.msg);
            return Promise.reject(
                'Error al generar el reporte de comisiones'
            );
        }
        const pathReport = path.join(dir_report.data.msg);
        
        const excelFile = fs.readFileSync(pathReport, 'base64');
        const typeMime = 'application/vnd.ms-excel';
        
        this.socket.socket.emit('returnReport',{
            id_user:data.id_user,
            type_file:typeMime,
            file_base64:excelFile
        })
        return Promise.resolve(`Reporte generado`);
    }
}
