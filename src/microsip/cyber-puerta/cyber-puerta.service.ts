import { Injectable,Inject } from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {HttpAxiosService} from '../../http-axios/http-axios/http-axios.service';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';
import { SocketService } from 'src/socket/socket/socket.service';
import { get } from 'http';
import axios, { AxiosResponse } from 'axios';
import { DateTime } from "luxon";
import { clearConfigCache } from 'prettier';
import { btoa } from 'buffer';

@Injectable()
export class CyberPuertaService {
    private logger:Logger

    constructor(
        @Inject(LoggerService)
        LoggerService:LoggerService,
        @Inject(KnexconnectionService)
        private readonly knexConn:KnexconnectionService,
        @Inject(HttpAxiosService)
        private readonly API:HttpAxiosService,
        @Inject(SocketService)
        private readonly socket:SocketService
    )
    {
        this.logger = LoggerService.wLogger({
            logName:'Cron CyberPuerta',
            level:'Agregar pedidos CyberPuerta a Microsip'
        })
    }

    @Cron('0 00,30 13,18 * * *')
    async cyberpuertaInvoices(){
        this.logger.info('ejecutando CronJob Facturas Cyberpuerta')
        console.log("inicio factura")
        const today = DateTime.now().setZone("America/Chihuahua").toString();
        let getOrders  = await this.knexConn.knexQuery('shoppings as sp')
        .whereNotNull("sp.folio_ms")
        .andWhere(function(){
            this.where('sp.id_reseller',2)
            .orWhere('sp.id_reseller',3)
        })
        .andWhere("sp.is_invoiced", 0).andWhere("sp.status", '<>',0).select('sp.folio_ms','sp.id_reseller');
        const folios = getOrders.map((objeto: { folio_ms: string; }) => objeto.folio_ms);
        const idReseller:string = getOrders.map((order:{id_reseller:number})=>order.id_reseller.toString());
        if(getOrders == "")
        {
            return {messsage: "no hay facturas pendientes"}
        }
        //peticion de info a C#
        const responseMS = await this.API.postMicrosip("Quotation/folioSAT",{req_token:"1234", folioMS:folios,idReseller:idReseller});
        const facturasMS = responseMS.data
        if(facturasMS.data == ""){
            this.logger.info('endpoint MS no hay pedidios a facturar')
            return {message: "endpoint MS no hay pedidios a facturar"}
        }
        for (let index = 0; index < facturasMS.data.length; index++) {
            const element = facturasMS.data[index];
            if(element.folioSat == ""){
                //update a cancelado
                let updatecancel={
                    status: 0,
                    is_invoiced: 0,
                    updated_at: today
                }
                await this.knexConn.knexQuery('shoppings').update(updatecancel).where('folio_ms', element.folioMicrosip)
                continue
            }
            let invoiceInfo= {
                order_number: element.folioCompufax,
                invoice_uuid: element.folioSat
            }
            try{
                let updateInfo={}
                let response;
                if(element.id_reseller == "2" || element.id_reseller == 2){
                    updateInfo={
                        is_invoiced: 1,
                        invoice_uuid: element.folioSat,
                        updated_at: today
                    }
                    let headers = {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': "Bearer "+process.env.CYBERPUERTA_TOKEN,
                        'x-mock-match-request-body': 'true'
                        }
                    let body = JSON.stringify(invoiceInfo)
                    let url = process.env.CYBERPUERTA_URL+"order/cfdi"
                
                    response = await axios.post(url, body, {headers})  
                    this.logger.info('Se envio factura a CP de order: '+invoiceInfo.order_number+' status http: '+response.status)
                }
                else{
                    updateInfo ={ is_invoiced: 1,
                    invoice_uuid: element.folioSat,
                    xml_factura:Buffer.from(element.xmlFactura.toString()).toString('base64'),
                    updated_at: today}
                }
                //update shopping is:invoiced a 1              
                
                await this.knexConn.knexQuery('shoppings').update(updateInfo).where('folio_ms', element.folioMicrosip)
            
            }catch(error){
                this.logger.info('error en envio de factura CP: '+JSON.stringify(error.response.data)+' order_reference'+invoiceInfo.order_number)
                continue;
                return error.response.data
            }    
        }
        //envio de facturar a cyberpuerta 
        this.logger.info('Se han envidado facturas a cyberpuerta') 
        return {message: "se han enviado las facturas"}
    }
}
