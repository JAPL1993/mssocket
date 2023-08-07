import { Injectable, Inject } from '@nestjs/common';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { HttpAxiosService } from 'src/http-axios/http-axios/http-axios.service';
import { SocketService } from 'src/socket/socket/socket.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';
import { Cron } from '@nestjs/schedule';
import { response } from 'express';
import { DateTime } from 'luxon';

@Injectable()
export class ProductsService {
  private logger: Logger;

  constructor(
    @Inject(LoggerService)
    @Inject(KnexconnectionService)
    @Inject(HttpAxiosService)
    loggerService: LoggerService,
    private readonly knexconn: KnexconnectionService,
    private readonly httpConn: HttpAxiosService,
  ) {
    this.logger = loggerService.wLogger({ logName: 'Cronjob', level: 'info' });
  }
  //@Cron('0 */1 * * * *')
  async insertProduct() {
    try {
      //traer todos los artículos de microsip que tienen un id_product_ms
      const productMicrosip = await this.knexconn
        .knexQuery('products')
        .where('id_supplier', 1)
        .whereNotNull('id_product_ms')
        .pluck('id_product_ms');
      //console.log(productMicrosip);
      //traer todos los articulos que estan en la BD Microsip
      const MicrosipArt: any = await this.httpConn.postMicrosip(
        'Product/syncProduct',
        {
          request_token: '1234',
        },
      );

      if (MicrosipArt.data.products.length > 0) {
        //traer todos los SKUs de las imagenes
        const img_array = await image_reference(this.knexconn);
        for (let i = 0; i < MicrosipArt.data.products.length; i++) {
          const element = MicrosipArt.data.products[i];
          /**Continua si el id del artículo de microsip ya existe en la
           * BD Compufax.
           */
          if (
            productMicrosip.includes(
              element.id_product_ms
            )
          ) {
            continue;
          }
          //EN EL CASO DE QUE NO EXISTA CREARLO

          //seleccionar que numero de parte usara
          const reference = this.validateReference(
            element.primary_reference,
            element.secondary_reference,
          );
          //crear codigo del proveedor
          const supplier_reference = 'MS-' + reference;
          const price = element.price.replace(',', '.');
          const cost = element.cost.replace(',', '.');
          const total_quantity =
            Number(element.reserved) + Number(element.quantity);
          const dollar_cost =
            element.coin == 'Dolares' ? Number(element.cost_dolar) : 0;
          const today = DateTime.now().setZone('America/Chihuahua').toString();

          let fechaUltComp = null;
          if(element.ult_fech_comp.length > 0){
            fechaUltComp = DateTime.fromISO(element.ult_fech_comp)
            fechaUltComp = fechaUltComp.toISODate();
            break;
          }

          //Insertar en la tabla products el nuevo artículo
          const idProduct = await this.knexconn.knexQuery('products').insert({
            active: 1,
            name: element.name,
            reference: reference,
            categories: element.category,
            sub_categories: element.subcategory,
            price: price,
            cost: cost,
            id_tax_rule: 55,
            quantity: element.quantity,
            brand: element.brand,
            supplier_reference: supplier_reference,
            available: 1,
            summary: '',
            description: '',
            img_url: '',
            id_supplier: 1,
            created_at: today,
            updated_at: today,
            is_icecat: 0,
            is_promotion: 0,
            reserved: element.reserved,
            dollar_cost: dollar_cost,
            cost_tc_microsip: cost,
            total_quantity: total_quantity,
            warranty:element.garantia ? element.garantia:'',
            last_date_bought:element.ult_fech_comp,
            last_cost_bought:element.ult_cost_comp,
            id_product_ms:element.id_product_ms
          });

          /**Insertar la información del artículo con respecto
           * al almacen.
           */
          await this.knexconn.knexQuery('product_warehouses').insert({
            id_warehouse:555,
            id_product:idProduct,
            quantity:element.quantity,
            created_at:today,
            updated_at:today
          })
          /**Insertar los precios de lista */
          
          //Consultar la información de Icecat

          //Si no existe una imagen con el numero de parte del artículo, se agrega.
        }
      }
      console.log('fin insertar articulos');
    } catch (error) {
      console.log(error);
    }
  }

  private validateReference(refP, refS) {
    if (refP != '' && refP != undefined) {
      if (refP.includes('#')) {
        const arryRef = refP.split('#');
        refP = arryRef[0];
      }
      return refP;
    } else if (refS != '' && refS != undefined) {
      if (refS.includes('#')) {
        const arryRef = refS.split('#');
        refS = arryRef[0];
      }
      return refS;
    }

    return '';
  }
}

const image_reference = async (knexConn: KnexconnectionService) => {
  const array_images = await knexConn
    .knexQuery('product_images')
    .groupBy('product_reference')
    .pluck('product_reference');

  return array_images;
};
