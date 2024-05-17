import { Injectable, Inject } from '@nestjs/common';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { HttpAxiosService } from 'src/http-axios/http-axios/http-axios.service';
import { SocketService } from 'src/socket/socket/socket.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { Logger } from 'winston';
import { Cron } from '@nestjs/schedule';
import { response } from 'express';
import { DateTime } from 'luxon';
import { on } from 'events';
import fetch from 'node-fetch';
import { CLIENT_RENEG_LIMIT } from 'tls';
require('dotenv').config();
@Injectable()
export class ProductsService {
  private logger: Logger;

  constructor(
    @Inject(LoggerService)
    loggerService: LoggerService,
    //@Inject(KnexconnectionService)
    private readonly knexconn: KnexconnectionService,
    @Inject(HttpAxiosService)
    private readonly httpConn: HttpAxiosService,
  ) {
    this.logger = loggerService.wLogger({ logName: 'Cronjob', level: 'info' });
  }
  /* @Cron('0 0 * * 1-6', {
    timeZone: 'your-timezone',
  }) */
  @Cron('0 00,00 13,15 * * *', {
    disabled: process.env.ENVIRONMENT == "produccion" ? false : true
})
  async insertProduct() {
    try {
      console.log("inicio de creacion de articulos")
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
          
          if (productMicrosip.includes(element.id_product_ms)) {
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
            Number(element.reserved) + Number(element.quantity) + Number(element.reservadoVentaEnLinea);
          const dollar_cost =
            element.coin == 'Dolares' ? Number(element.cost_dolar) : 0;
          const today = DateTime.now().setZone('America/Chihuahua').toString();

          let fechaUltComp = null;
          if (element.ult_fech_comp.length > 0) {
            fechaUltComp = DateTime.fromISO(element.ult_fech_comp);
            fechaUltComp = fechaUltComp.toISODate();
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
            reserved_ventaenlinea : element.reservadoVentaEnLinea,
            hasventaenlinea:element.hasVentaEnLinea,
            dollar_cost: dollar_cost,
            cost_tc_microsip: cost,
            total_quantity: total_quantity,
            warranty: element.garantia ? element.garantia : '',
            last_date_bought: element.ult_fech_comp,
            last_cost_bought: element.ult_cost_comp,
            id_product_ms: element.id_product_ms,
          });

          /**Insertar la información del artículo con respecto
           * al almacen.
           */
          await this.knexconn.knexQuery('product_warehouses').insert({
            id_warehouse: 555,
            id_product: idProduct,
            quantity: element.quantity,
            created_at: today,
            updated_at: today,
          });
          /**Insertar los precios de lista */
          const pricesMicrosip = await this.httpConn.postMicrosip(
            'Product/pricesProduct',
            {
              request_token: '1234',
              reference: reference,
            },
          );
          if (
            Object.keys(pricesMicrosip.data).length != 0 &&
            pricesMicrosip.data.constructor === Object
          ) {
            for (const key in pricesMicrosip.data) {
              const objAux = pricesMicrosip.data[key];
              for (let i = 0; i < objAux.precioLista.length; i++) {
                const elementP = objAux.precioLista[i];

                const existe = await this.knexconn
                  .knexQuery('seller_microsip_prices')
                  .select('id')
                  .where('name', elementP.name)
                  .where('id_microsip', key);

                if (existe.length == 0) {
                  await this.knexconn
                    .knexQuery('seller_microsip_prices')
                    .insert({
                      reference: reference,
                      price_microsip: elementP.price,
                      name: elementP.name,
                      position: elementP.position,
                      id_microsip: key,
                      created_at: today,
                      updated_at: today,
                    });
                }
              }
            }
          }
          //Consultar la información de Icecat
          const resIcecat = await callIcecat(element.brand,reference, this.knexconn);
          //const resIcecat = await callIcecat('CANON', '0667C001AA', this.knexconn);
          //const resIcecat = await callIcecat('CANON', 'foefwefisfo', this.knexconn);
          
          if (resIcecat) {
            let barCode = '';
            if (resIcecat['data'].hasOwnProperty('GeneralInfo')) {
              if (resIcecat['data']['GeneralInfo'].hasOwnProperty('GTIN')) {
                if (resIcecat['data']['GeneralInfo']['GTIN'].length > 0) {
                  barCode = resIcecat['data']['GeneralInfo']['GTIN'][0];
                }
              }
            }
            let img_url = resIcecat['data']['Image']['HighPic'];
            let gallery = resIcecat['data']['Gallery'];

            //actualizar los datos
            
            await this.knexconn
              .knexQuery('products')
              .where('id_product', idProduct[0])
              .update({
                img_url: img_url,
                barcode: barCode,
                is_icecat:1,
              });
            //Si no existe una imagen con el numero de parte del artículo, se agrega.
            
            if (img_array.includes(reference)) {
              
              for (let i = 0; i < gallery.length; i++) {
                const elementI = gallery[i];
                
                let img =
                elementI['Pic500x500'] != ''
                    ? elementI['Pic500x500']
                    : elementI['Pic'];
                if(!img){
                  continue;
                }
                await this.knexconn.knexQuery('product_images').insert({
                  product_reference:reference,
                  url_image:img,
                  created_at:today,
                  updated_at:today,
                })
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.log(error);
    }
  }

  @Cron('0 */10 * * * *', {
    disabled: process.env.ENVIRONMENT == "produccion" ? false : true
})
  async updateMicrosipProducts(){
    try{
      this.logger.info('Se inicio Actualizacion de Art. de Microsip a Cotifast');
      const MicrosipArt: any = await this.httpConn.postMicrosip(
        'Product/syncProduct',
        {
          request_token: '1234',
        },
      );
      this.logger.info('Peticion C#: Completa y enviada a CotifastBackend');
      const resNode:any = await this.httpConn.postNode('api/compras/updateMicrosip',MicrosipArt.data);
      if(resNode.status == "success"){
        this.logger.info('Se Actualizaron los Art. de Microsip');
      }else{
        this.logger.error("CotifastBackend deveolvio un error", resNode)
      }
    }catch(error){
      this.logger.error('Error al actualizar los Art. de Microsip', error.message);
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
  @Cron('0 00 13,18 * * *', {
    disabled: process.env.ENVIRONMENT == "produccion" ? false : true
})
  async updatePricesMicrosipNode(){
    try {
      this.logger
      .info("Inicio Actualizacion de precios Microsip");
      const ArrayPrices = await this.httpConn
      .postMicrosip(
        "Product/pricesProduct",
        {request_token:"1234"}
      );
      this.logger
      .info("Actualizacion Precios. Enviando informacion a Backend cotifast");
      if(ArrayPrices['status'] == 400){
        this.logger
        .error(
          "Fallo la generacion de la lista de precios a acutalizar",
        );
        return true;
      }
      const resExchangeRate = await this.httpConn
      .postMicrosip(
        "Product/exchangeRateMicrosip",
        {token:"1234"}
      )
      const dPrice = {
          pricesMs:ArrayPrices.data,
          exchangeRate:resExchangeRate.data.exchange_rate
        }

      const resNodePrices = await this.httpConn
      .postNode(
        "api/shoppingCart/updatePricesMicrosip",
        dPrice
      )
      console.log(resNodePrices);
    } catch (error) {
      this.logger
      .error(
        "Error al actualizar los precios de articulos Microsip en Cotifast",
        error.message
      );
      console.log(error);
    }
  }
}

const image_reference = async (knexConn: KnexconnectionService) => {
  const array_images = await knexConn
    .knexQuery('product_images')
    .groupBy('product_reference')
    .pluck('product_reference');

  return array_images;
};

const callIcecat = async (brand, sku, knexConn: KnexconnectionService) => {
  //hacer llamada sin el codigo de barras
  let url = generateUrlIcecat(brand, sku, '');
  const resultSku = await fetch(url);
  const jsonResponse = await resultSku.json();
  //responde por sku y marca ?
  if (jsonResponse.hasOwnProperty('msg')) {
    return jsonResponse;
  }
  //traer el codigo de barra del artículo
  const barcode = await knexConn
    .knexQuery('products')
    .first('barcode')
    .whereNot('id_supplier', 1)
    .whereNot('barcode', '')
    .where('reference', sku)
    .orderBy('id_supplier');

  if (barcode) {
    url = generateUrlIcecat(brand, sku, barcode.barcode);
    const resultCode = await fetch(url);
    const responseCode = await resultCode.json();
    if (responseCode.hasOwnProperty('msg')) {
      return responseCode;
    }
    return false;
  }

  return false;
};

const generateUrlIcecat = (brand, sku, barcode) => {
  const baseUrl = 'https://live.icecat.biz/api/?UserName=Compufax&Language=es&';

  const restUrl =
    barcode == ''
      ? 'Brand=' + brand + '&ProductCode=' + sku
      : 'GTIN=' + barcode;

  return baseUrl + restUrl;
};
