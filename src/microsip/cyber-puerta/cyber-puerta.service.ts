import { Injectable,Inject } from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {HttpAxiosService} from '../../http-axios/http-axios/http-axios.service';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';
import { SocketService } from 'src/socket/socket/socket.service';


@Injectable()
export class CyberPuertaService {
    private logger:Logger
    private DataEvent = [];
    private isQueueProcessing = false;
    constructor(
        @Inject(LoggerService)
        @Inject(KnexconnectionService)
        @Inject(HttpAxiosService)
        @Inject(SocketService)
        LoggerService:LoggerService,
        private readonly knexConn:KnexconnectionService,
        private readonly API:HttpAxiosService,
        private readonly socket:SocketService
    )
    {
        this.logger = LoggerService.wLogger({
            logName:'Cron CyberPuerta',
            level:'Agregar pedidos CyberPuerta a Microsip'
        })

        this.DataEvent = [];
        this.isQueueProcessing = false;

        const _SocketEvents = {
            insertOrderCP:(data:any)=>{
                this.DataEvent.push(data);
                if(!this.isQueueProcessing){
                    this.proccesCyberToMicrosip();
                }
            }
        }

        Object.keys(_SocketEvents).forEach((channel) => {
            const handler = _SocketEvents[channel];
            socket.socket.on(channel, (data: any) => handler(data));
          });
    }

    private async proccesCyberToMicrosip(){
        this.isQueueProcessing = true;
        while(this.DataEvent.length > 0){
            const data  = this.DataEvent.shift();
            await this.cyberPuertoToMicrosip(data,this.API,this.knexConn);
        }
        this.isQueueProcessing = false;
    }
    //@Cron('0 */5 * * * *')
    async cyberPuertoToMicrosip(element:any,httpService:HttpAxiosService,knexConn:KnexconnectionService){
        try{
            //Emitir evento socket empezo con un pedido
            const resultOrder = await this.insertEvent(element,httpService,knexConn);
            //Emitir evento socket finalizo con exito

        }
        catch(error){
            console.log(error);
            //Emitir evento socket error
        }
    }

    private async insertEvent(
        data:any,
        httpService:HttpAxiosService,
        knex:KnexconnectionService
    ):Promise<any>
    {
        const dataSeller = await httpService.postMicrosip(
            "Seller/createSeller",
            {
                request_token:"1234",
                name:"VENTASWEB1"
            });
        //validar respuesta
        if(dataSeller.data.status == "400"){
            return Promise.reject("Error seller MICROSIP")
        }
        //Obtener el id del vendedor
        const _idSellerMS = dataSeller.data.id_seller;
        //Obtener id del cliente
        const _idCustomerMS = 24547;
        
        //Preparar los datos para agregar el pedido en microsip
        let arraySupplier = [];
        let arrayQuantity = [];
        let arrayName = [];
        let arrayPrices = [];
        let arrayCosts = [];
        let arrayNotes = [];
        let arrayCreate = [];
        let arrayReference = [];
        const total:string  = String(data.total)
        const idVendedor:string = String(_idSellerMS)
        const orderRef:string = data.order_reference
        const orderNumber:string = String(data.order_reference)
        const customerId:string = String(_idCustomerMS)

        for (let i = 0; i < data.products.length; i++) {
            const product = data.products[i];
            const priceProduct = Number(product.price).toFixed(2);
            const costo = Number(product.cost).toFixed(2);
            arraySupplier.push(product.id_supplier_ps);
            arrayQuantity.push(product.quantity);
            arrayName.push(product.name);
            arrayPrices.push(priceProduct.toString());
            arrayCosts.push(costo.toString());
            arrayNotes.push(".");
            arrayCreate.push(1);
            arrayReference.push(product.reference);
        }

        //insertar pedido de microsip
        const dataInsert:any = {
            request_token:"1234",
            supplier:arraySupplier.join(","),
            reference:arrayReference.join(","),
            quantity:arrayQuantity.join("|"),
            price:arrayPrices.join("|"),
            cost:arrayCosts.join("|"),
            id_cli_microsip:customerId,
            fecha:new Date().toLocaleDateString('es-MX'),
            total:total,
            vendedo_id:idVendedor,
            descrip:orderRef,
            arrayNotas:arrayNotes.join("|"),
            orderNumberMS:orderNumber,
            nameArray:arrayName.join("|"),
            CheckProdMS:arrayCreate.join("|"),
            cond_id:"0",
            dir_id:"0",
        }

        //insertar pedido
        console.log(dataInsert);
        const insertedOrder: any = await httpService.postMicrosip(
            'Quotation/createQuotation',
            dataInsert,
        );
        if (insertedOrder == undefined) {
            return Promise.reject(
              `There was an error creating or getting the Quotation for order: ${data.order_reference} the error can be found in the log file`,
            );
          }
          if (
            insertedOrder.data.status == '400' ||
            insertedOrder.data.status == 'error' ||
            insertedOrder.data.status == 400 ||
            insertedOrder.data.status == undefined
          ) {
            //actualizar pedido con error
            console.log(insertedOrder.data.msg)
            return Promise.reject(
                `There was an error creating or getting the Quotation for order: ${data.order_reference} the error can be found in the log file`,
              );
          }
          //actualizar pedido success
          await knex.knexQuery('order_paids')
          .where('id',data.id_order)
          .update({
            is_microsip:1
          })
          console.log(insertedOrder.data);
          return Promise.resolve(`Pedido agregado con exito: ${data.order_reference}`);
    }
}
