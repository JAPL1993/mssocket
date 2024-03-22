import { HttpAxiosService } from './../../http-axios/http-axios/http-axios.service';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Knex } from 'knex';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';
import { MicrosipModule } from '../microsip.module';
import { DateTime } from 'luxon';
import { getConfigToken } from '@nestjs/config';
@Injectable()
export class EntregadoEstatusService {
    private logger: Logger
constructor(
    @Inject(LoggerService) loggerService : LoggerService,
    @Inject(KnexconnectionService) private readonly knexConn : KnexconnectionService,
    @Inject(HttpAxiosService) private readonly API: HttpAxiosService
    ) {
    this.logger = loggerService.wLogger({logName: 'Cronjob', level: 'info'})
    }
    @Cron('0 */5 * * * *')
    async entregados(){
        //SELECT * FROM seller_cart_shoppings where status = 5 AND TypeDoctFinal is NULL AND folio_cot_ms <> "PEDIDO COMPRA"
        const pedidos = await this.knexConn.knexQuery("seller_cart_shoppings").whereNull('TypeDoctFinal').andWhere('status', 5).andWhere('folio_cot_ms', '<>', 'PEDIDO COMPRA')
        const tam: number = pedidos.length;
        if (tam > 0) {
            console.log('Devolvio algo la query');
            const dataId: string[] = [];
            const dataFolio: string[] = [];
            for (const row of pedidos) {
                if (row['folio_cot_ms'] === null || row['folio_cot_ms'] === "") {
                    continue;
                }
                dataId.push(String(row['id_cart']));
                dataFolio.push(String(row['folio_cot_ms']));
            }
            const ArrayStringId: string = dataId.join("|");
            const ArrayStringFolio: string = dataFolio.join("|");
            const dataRequestC: { request_token: string, ArrayStringId: string, ArrayStringFolio: string } = {
                request_token:'1234',
                ArrayStringId,
                ArrayStringFolio
            };
            const resStatus = await this.API.postMicrosip("Quotation/delivered", dataRequestC);

            if (resStatus['data']['status'] === '400' || resStatus['data']['status'] === '201') {
                console.log("nada que actualizar", resStatus['data']['msg']);
            } else {
                console.log("entro al esle para api backendcotifast", resStatus.data.data)
                const ResponseNode = await this.API.postNode("api/compras/EntregadoStatus", {"ArrayStatusChange": resStatus.data.data});
                console.log(ResponseNode);
            }
        }
    }
    @Cron('0 25 15 * * *')
    async rollbackPedidosEntregado(){
        this.logger.info('inicio endpoint rollback a En Bodega')
        const to = DateTime.now().setZone('America/Merida').toISODate();
        const from = DateTime.now().minus({months: 2 }).setZone('America/Merida').toISODate();
        const pedidos = await this.knexConn.knexQuery("seller_cart_shoppings as sp")
        .whereNotNull("sp.folio_cot_ms")
        .andWhere('sp.status', 6)
        .andWhere('sp.folio_cot_ms', '<>', 'PEDIDO COMPRA')
        .andWhere('sp.folio_cot_ms', '<>', '')
        .whereBetween('sp.updated_at', [from, to]).select('sp.folio_cot_ms');
        const folios = pedidos.map((element:{folio_cot_ms:string})=> element.folio_cot_ms);
        let arrChunk = []
        let chunkSize = 250
        for(let i = 0; i < folios.length; i += chunkSize){
            arrChunk.push(folios.slice(i, i + chunkSize))
        }
        for (let index = 0; index < arrChunk.length; index++) {
            const arrFolios = arrChunk[index];
            let concatFolios = ""
            for (let j = 0; j < arrFolios.length; j++) {
                const element = arrFolios[j];
                concatFolios += "'"+element+"',"
                
            }
            const string_sinComa_Final = concatFolios.substring(0, (concatFolios.lastIndexOf(",")))
            try {
                const resStatus = await this.API.postMicrosip("Quotation/rollbackEntregados", {
                    request_token:'1234',
                    folios:string_sinComa_Final
                });
            if(resStatus.data.data.length == 0){
                this.logger.info('endpoint rollback->no hay folios para rollback')
                continue;
            }
            //se actualizan los folios en base de datos -Cotifast a En Bodega
            this.logger.info('endpoint rollback->actualizando folios '+resStatus.data.data+' a En Bodega')
            const resUpdated = await this.knexConn.knexQuery("seller_cart_shoppings").whereIn("folio_cot_ms", resStatus.data.data).update({status:5, TypeDoctFinal: null})
            } catch (error) {
                return error
            } 
        }
        this.logger.info('Finalizo el endpoint rollback a En Bodega')
    }
}
