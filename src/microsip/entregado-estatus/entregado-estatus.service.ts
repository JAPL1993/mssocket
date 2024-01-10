import { HttpAxiosService } from './../../http-axios/http-axios/http-axios.service';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Knex } from 'knex';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';
import { MicrosipModule } from '../microsip.module';

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
    //@Cron('0 */5 * * * *')
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
}
