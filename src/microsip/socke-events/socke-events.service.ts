import { HttpService } from '@nestjs/axios';
import { Injectable, Inject } from '@nestjs/common';
import { AxiosPromise } from 'axios';
import { resolve} from 'path';
import { clearConfigCache } from 'prettier';
import { HttpAxiosService } from 'src/http-axios/http-axios/http-axios.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { SocketService } from 'src/socket/socket/socket.service';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { Logger } from 'winston';
import { Cron } from '@nestjs/schedule';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter'
import { EntregadoEstatusService } from '../entregado-estatus/entregado-estatus.service';

@Injectable()
export class SockeEventsService {
  private logger: Logger;
  private eventQueue = [];
  private eventQueue2 = [];
  private eventQueueUpdate = [];
  private eventQueueOneProduct = [];
  private findSku = [];
  private isQueueProcessing = false;
  private isQueueProcessingF = false;
  private isQueueUpdateProcessing = false;
  private isQueueOneProduct = false;
  private isFindSku = false;
  constructor(
    @Inject(SocketService) 
    private readonly socket: SocketService,
    @Inject(HttpAxiosService) 
    private httpService: HttpAxiosService,
    @Inject(LoggerService) 
    private loggerService: LoggerService,
    @Inject(KnexconnectionService)
    private readonly knexConn:KnexconnectionService,
    @Inject(EventEmitter2)
    private eventEmitter:EventEmitter2
  ) {
    this.logger = loggerService.wLogger({
      logName: 'Inser Microsip Service',
      level: 'info',
    });
    this.eventQueue = [];
    this.eventQueue2 = [];
    this.eventQueueUpdate = [];
    this.eventQueueOneProduct = [];
    this.findSku = [];
    this.isQueueProcessing = false;
    this.isQueueProcessingF = false;
    this.isQueueUpdateProcessing = false;
    this.isQueueOneProduct = false;
    this.isFindSku = false;
    const handlers = {
      insertFolio: (data: any) => {
        this.eventQueue.push(data);
        if (!this.isQueueProcessing) {
          this.processEventQueue();
        }
      },
      funarFolio: (data: any) => {
        this.eventQueue2.push(data);
        if(!this.isQueueProcessingF){
          this.processFunarQueue();
        }
      },
      respuestaMicrosip:(data:any)=>{
        this.eventQueueUpdate.push(data);
        if(!this.isQueueUpdateProcessing){
          this.processUpdateMicrosip();
        }
      },
      updateOneProdMS:(data:any)=>{
        this.eventQueueOneProduct.push(data);
        if(!this.isQueueOneProduct){
          this.processOneMicrosip();
        }
      }
    };
    Object.keys(handlers).forEach((eventName) => {
      const handler = handlers[eventName];
      socket.socket.on(eventName, (data: any) => handler(data));
    });
  }
  private async processEventQueue() {
    this.isQueueProcessing = true;
    while (this.eventQueue.length > 0) {
      const data = this.eventQueue.shift();
      if(data.type == 1){
        //Cotifast
        await this.handlerInsertFolio(data, this.httpService);
      }
      else if(data.type == 2){
        //venta en linea
        await this.handlerSaleOnlineToMicrosip(data,this.httpService,this.knexConn);
      }
    }
    this.isQueueProcessing = false;
  }

  private async processFunarQueue(){
    this.isQueueProcessingF = true;
    while (this.eventQueue2.length > 0) {
      const data = this.eventQueue2.shift();
      await this.msFunarFolio(data, this.httpService);
    }
    this.isQueueProcessingF = false;    
  }

  private async processUpdateMicrosip(){
    this.isQueueUpdateProcessing = true;
    while(this.eventQueueUpdate.length > 0){
      const data = this.eventQueueUpdate.shift();
      await this.handlerMicrosip(data,this.httpService);
    }
    this.isQueueUpdateProcessing = false; 
  }

  private async processOneMicrosip(){
    this.isQueueOneProduct = true;
    while(this.eventQueueOneProduct.length > 0){
      const data = this.eventQueueOneProduct.shift();
      await this.handlerOneMicrosip(data,this.httpService);
    }
    this.isQueueOneProduct = false; 
  }
  //Handler Events
  handlerInsertFolio = async (data: any, httpService: HttpAxiosService) => {
    try {
      this.logger.info('Starting InserMS Process');
      const response = await httpService.postNode(
        'api/shoppingCart/cartSearchForMicrosip',
        {id_hash:data.id_hash},
      );
      let id_window = data.id_window
      //console.log(response.data)
      //para axios usar response.data.data para fetch usar response.data
      this.socket.socket.emit('beginInsertion', response.data);
      const result = await this.msInsertFolio(response.data, httpService, id_window);
      this.socket.socket.emit('successInsertion', data);
      this.logger.info(result);
    } catch (error) {
      this.socket.socket.emit('errorInsertion', data);
      if (error.response) {
        this.logger.error('Error while fetching data from Node backend', error);
      } else {
        this.logger.error('Error while inserting the data', error);
      }
    }
  };
  //Prueba
  handlerMicrosip = async (data: any, httpService: HttpAxiosService) => {
    try {
      const result = await this.updateDataMicrosip(data,httpService);
      
    } catch (error) {
      console.log(error);
    }
  };

  handlerOneMicrosip = async (data: any, httpService: HttpAxiosService) => {
    try {
      const result = await this.updateOneDataMicrosip(data,httpService);
      
    } catch (error) {
      console.log(error);
    }
  };
  //Methods for inserction
  async msInsertFolio(data: any, httpService: HttpAxiosService, id_window:any): Promise<any> {
    if (data.length <= 0) {
      return Promise.reject('No data recived by Node Backend');
    }
    const {
      id_cart,
      total,
      orderNumberMS,
      description,
      seller,
      customer,
      products,
      id_user,
    } = data[0];
    const microsipDescription = `${id_cart} | ${
      description == null ? '' : description
    }`;
    const sellerName =
      `${seller.name_seller} ${seller.last_name_seller}`.toLocaleUpperCase();
    const idCustomerMS = customer.id_customer_microsip;
    const sellerData = { request_token: '1234', name: sellerName };
    //console.log('Seller/createSeller');
    const insertedSeller: any = await httpService.postMicrosip(
      'Seller/createSeller',
      sellerData,
    );
    if (insertedSeller == undefined) {
      console.log('entro a undefined del usuario');
      return Promise.reject(
        `There was an error creating or getting the seller for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    if (
      insertedSeller.data.status == '400' ||
      insertedSeller.data.status == 'error' ||
      insertedSeller.data.status == 400 ||
      insertedSeller.data.status == undefined
    ) {
      console.log("Entro en creacion usuario error")
      const insertedNode: any = await httpService.postNode(
        'api/shoppingCart/insertDataMS',
        {
          response_array: [],
          response_error: [{id_cart:id_cart,folio:"error no agregado - creación de usuario vendedor",id_user: id_user, id_window: id_window}],
        },
      );
      return Promise.reject(
        `There was an error creating or getting the seller for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    const id_seller = insertedSeller.data.id_seller;
    const customerData = {
      request_token: '1234',
      id_customer_microsip: idCustomerMS,
    };
    //console.log('Quotation/insertCustomerNode');
    const insertedCustomer: any = await httpService.postMicrosip(
      'Quotation/insertCustomerNode',
      customerData,
    );
    //console.log(insertedCustomer)
    if (insertedCustomer == undefined) {
      return Promise.reject(
        `There was an error creating or getting the customer for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    if (
      insertedCustomer.data.status == '400' ||
      insertedCustomer.data.status == 'error' ||
      insertedCustomer.data.status == 400 ||
      insertedCustomer.data.status == undefined
    ) {
      const insertedNode: any = await httpService.postNode(
        'api/shoppingCart/insertDataMS',
        {
          response_array: [],
          response_error: [{id_cart:id_cart,folio:"error no agregado - error al buscar usuario",id_user: id_user, id_window: id_window}],
        },
      );
      return Promise.reject(
        `There was an error creating or getting the customer for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    const supplierArrays: any[] = [];
    const quantityArrays: any[] = [];
    const costsArrays: any[] = [];
    const priceArrayS: any[] = [];
    const referenceArrayS: any[] = [];
    const notasArray: any[] = [];
    const nameArray: any[] = [];
    const createProduct: any[] = [];

    //diccionario que tendra las referencias y articulos
    const objAux: any = {};
    //juntar los articulos de la misma referencia para juntar las cantidades y aparezcan las unidades del producto en general y no individualmente
    for (const value of products) {
      value['reference'] = value['reference'].trim();
      if (value['reference'] == 'SINCOD') {
        //codigo para agrupar articulos SINCOD
        if (value['sku'] in objAux) {
          //agrupar las cantidades, precios y costos
          objAux[value['sku']]['quantity_cart'] =
            objAux[value['sku']]['quantity_cart'] + value['quantity_cart'];
          objAux[value['sku']]['price_product'] =
            objAux[value['sku']]['price_product'] +
            (value['price_product'] * value['quantity_cart'] +
              value['shipping_cost']);
          objAux[value['sku']]['cost_product'] =
            objAux[value['sku']]['cost_product'] +
            value['cost_product'] * value['quantity_cart'];
        } else {
          //agregar por primera vez a la lista
          objAux[value['sku']] = value;
          objAux[value['sku']]['price_product'] =
            objAux[value['sku']]['price_product'] *
              objAux[value['sku']]['quantity_cart'] +
            objAux[value['sku']]['shipping_cost'];
          objAux[value['sku']]['cost_product'] =
            objAux[value['sku']]['cost_product'] *
            objAux[value['sku']]['quantity_cart'];
        }
      } else {
        //codigo para agrupar articulos los cuales no son SINCOD
        if (value['reference'] in objAux) {
          objAux[value['reference']]['quantity_cart'] =
            objAux[value['reference']]['quantity_cart'] +
            value['quantity_cart'];
          objAux[value['reference']]['price_product'] =
            objAux[value['reference']]['price_product'] +
            (value['price_product'] * value['quantity_cart'] +
              value['shipping_cost']);
          objAux[value['reference']]['cost_product'] =
            objAux[value['reference']]['cost_product'] +
            value['cost_product'] * value['quantity_cart'];
        } else {
          objAux[value['reference']] = value;
          objAux[value['reference']]['price_product'] =
            objAux[value['reference']]['price_product'] *
              objAux[value['reference']]['quantity_cart'] +
            objAux[value['reference']]['shipping_cost'];
          objAux[value['reference']]['cost_product'] =
            objAux[value['reference']]['cost_product'] *
            objAux[value['reference']]['quantity_cart'];
        }
      }
    }
    let bandera = false;
    //Dividir la cantidad total entre el precio y costo
    for (const prod in objAux) {
      const quantityCart = objAux[prod]['quantity_cart'];
      objAux[prod]['price_product'] = (
        objAux[prod]['price_product'] / quantityCart
      ).toFixed(2);
      objAux[prod]['cost_product'] = (
        objAux[prod]['cost_product'] / quantityCart
      ).toFixed(2);
    }
    for (const product in objAux) {
      bandera = false;
      // preparación de los parametros para el endpoint insertProductMicrosip
      const pricesStrInsertMS: string[] = [];
      const marginStrInsertMS: string[] = [];
      if (objAux[product]['reference'] === 'SINCOD') {
        objAux[product]['reference'] = objAux[product]['sku'];
        objAux[product]['name'] = objAux[product]['nameSincod'];
      }
      if (objAux[product]['reference'].length > 20) {
        objAux[product]['reference'] = objAux[product]['reference'].substr(
          0,
          20,
        );
      }
      const name_Product = objAux[product]['name'];
      const price = Number(objAux[product]['price_product']).toFixed(2);
      const reference = objAux[product]['reference'];
      const listaPricesMS = this.listPrices(objAux[product]['cost_product']);
      for (const row of listaPricesMS) {
        const rprice = Number(row['precio']).toFixed(2);
        const rmargin = row['margen'];
        pricesStrInsertMS.push(rprice.toString());
        marginStrInsertMS.push(rmargin.toString());
      }

      // pasar el array en forma de un string para mandarlo a la api de c#
      const StringInsertPricesMS = pricesStrInsertMS.join('|');
      const StringInsertMargenMS = marginStrInsertMS.join('|');

      const dProduct = {
        request_token: '1234',
        name: name_Product.toString().toUpperCase(),
        price: price.toString(),
        reference: reference.toString().toUpperCase(),
        nameSeller: sellerName,
        pricesArray: StringInsertPricesMS.toString(),
        margenArray: StringInsertMargenMS.toString(),
        checkCreate: objAux[product]['createProdMS'].toString(),
      };
      // console.log(dProduct);
      //sys.exit();
      // preparación de los parametros para la cotización
      let notas = '';
      if (objAux[product]['comment'] === null) {
        notas = '';
      } else {
        notas = objAux[product]['comment'].toString();
      }
      const costRound = Number(objAux[product]['cost_product']).toFixed(2);
      supplierArrays.push(objAux[product]['id_supplier'].toString());
      quantityArrays.push(objAux[product]['quantity_cart'].toString());
      costsArrays.push(costRound.toString());
      priceArrayS.push(price.toString());
      referenceArrayS.push(reference.toString().toUpperCase());
      notasArray.push(notas);
      nameArray.push(name_Product.toString());
      createProduct.push(objAux[product]['createProdMS'].toString());

      // consumir el endpoint insertar productos
      const insertedProduct: any = await httpService.postMicrosip(
        'Quotation/insertProductNode',
        dProduct,
      );
      //console.log(insertedProduct)
      if (insertedProduct == undefined) {
        return Promise.reject(
          `There was an error creating or getting the product for id_cart: ${id_cart} the error can be found in the log file`,
        );
      }
      if (
        insertedProduct.data.status == '400' ||
        insertedProduct.data.status == 'error' ||
        insertedProduct.data.status == 400 ||
        insertedProduct.data.status == undefined
      ) {
        const insertedNode: any = await httpService.postNode(
          'api/shoppingCart/insertDataMS',
          {
            response_array: [],
            response_error: [{id_cart:id_cart,folio:"error no agregado - creación de artículos",id_user: id_user, id_window: id_window}],
          },
        );
        return Promise.reject(
          `There was an error creating or getting the product for id_cart: ${id_cart} the error can be found in the log file`,
        );
      }
    }
    const suppliersString = supplierArrays.join(',');
    const quantitysString = quantityArrays.join('|');
    const costsString = costsArrays.join('|');
    const priceString = priceArrayS.join('|');
    const referenceString = referenceArrayS.join(',');
    const notasString = notasArray.join('|');
    const nameString = nameArray.join('|');
    const checkProd = createProduct.join('|');

    //preparar los datos que va a recibir como argumento el endpoint
    //consumir la cotización
    const today: Date = new Date();
    const formattedToday: string = today.toLocaleDateString('es-MX');
    const dataQuot = {
      request_token: '1234',
      supplier: suppliersString,
      reference: referenceString,
      quantity: quantitysString,
      price: priceString,
      cost: costsString,
      id_cli_microsip: String(idCustomerMS),
      fecha: formattedToday,
      total: String(total),
      vendedo_id: String(id_seller),
      descrip: String(microsipDescription),
      arrayNotas: notasString,
      orderNumberMS: orderNumberMS,
      nameArray: nameString,
      CheckProdMS: checkProd,
      cond_id: String(data[0].cond_id),
      dir_id: String(data[0].dir_id),
    };
    //console.log('Quotation/createQuotation');
    const insertedQuot: any = await httpService.postMicrosip(
      'Quotation/createQuotation',
      dataQuot,
    );
    //console.log(insertedQuot)
    if (insertedQuot == undefined) {
      return Promise.reject(
        `There was an error creating or getting the Quotation for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    if (
      insertedQuot.data.status == '400' ||
      insertedQuot.data.status == 'error' ||
      insertedQuot.data.status == 400 ||
      insertedQuot.data.status == undefined
    ) {
      let folioErrorMessage = "error no agregado - " + insertedQuot.data.msg
      if(folioErrorMessage.length > 190){
        folioErrorMessage =  folioErrorMessage.slice(0,189)
      }
      /*console.log("folio:",folioErrorMessage,
        "id_cart:",id_cart,
        "id_user:",id_user,
        "id_window:",id_window
      );*/
      const insertedNode: any = await httpService.postNode(
        'api/shoppingCart/insertDataMS',
        {
          response_array: [],
          response_error: [{id_cart:id_cart,folio:folioErrorMessage,id_user: id_user, id_window: id_window}],
        },
      );

      return Promise.reject(
        `There was an error creating or getting the Quotation for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    //SOCKET SKU MICROSIP
    console.log("llego antes de mandar el evento")
    this.eventEmitter.emit('order.addSku',id_cart);
    console.log("Despues de mandar el evento addSkuMicrosip")
    const dataResponse = {
      id_cart: id_cart,
      folio: insertedQuot.data.folio,
      id_user: id_user,
      id_window: id_window
    };
    console.log(dataResponse);
    const insertedNode: any = await httpService.postNode(
      'api/shoppingCart/insertDataMS',
      {
        response_array: [dataResponse],
        response_error: [],
      },
    );
    if (insertedNode == undefined) {
      return Promise.reject(
        `There was an error creating or getting for the final node insertion for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    if (
      insertedNode.status == '400' ||
      insertedNode.status == 'error' ||
      insertedNode.status == 400 ||
      insertedNode.status == undefined
    ) {
      return Promise.reject(
        `There was an error creating or getting for the final node insertion for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    return Promise.resolve(
      `The Folio has been insert successfuly for the id_cart: ${id_cart}, folio: ${insertedQuot.data.folio}, user: ${id_user}-${sellerName}`,
    );
  }

  async msFunarFolio(data: any, httpService: HttpAxiosService): Promise<any>{
    try {
      console.log("ejecucion de funarFolio: ", data)
      console.log(data.folio)
      const folioMS =  {
        "request":"1234",
        "folio":data.folio,
        "id_order":data.id_cart
      }
      let responseData = {}
      const resStatus = await httpService.postMicrosip("Quotation/cancelOrder", folioMS);
      console.log(resStatus.data);
      if(resStatus.data.status == "400" ){
        responseData = {"id_cart":data.id_cart,"action":0,"userMod":parseInt(data.userMod)};
      }
      else{
        responseData = {"id_cart":data.id_cart,"action":1,"userMod":parseInt(data.userMod)};
      }
      console.log(responseData);
      const cancelUpdate = await httpService.postNode('api/sellerQuotation/cancelUpdate',responseData);
      console.log(cancelUpdate.data);

    } catch (error) {
      console.log(error);
    }
  }

  async updateDataMicrosip(data:any,httpService:HttpAxiosService):Promise<any>{
    console.log('todo goood: ',data['id_cart'],' ',data['id_user_mod']," ",data['id_window']);
    
      //logica de negocio
      const dataReturn = await httpService.postMicrosip(
        'Quotation/updateProductOrder',
        {
          request:"1234",
          references:data.data
        }
      );
      if(dataReturn.data.status != "200"){
        //Evento disparar requotProveedor
        this.socket.socket.emit('triggerRequotProv', {
          "id_cart":data['id_cart'],
          "idUser":data['id_user_mod'],
          "id_window":data['id_window'],
        });
        return Promise.reject('Error al obtener iformación de los artículos Microsip');
      }
      const dataUpdate = {
        dataProd:dataReturn.data.data,
        idUser:data['id_user_mod'],
        id_cart:data['id_cart'],
        id_window:data['id_window'],
      }
      //Endpoint Node actualizar artículos de microsip
      const resNode:any = await httpService.postNode('api/microsip/updateDataMicrosip',dataUpdate);
      
      if(resNode.status != 'success'){
        return Promise.reject(
          `Error al actualizar iformación de los artículos Microsip`,
        );
      }
      
      return Promise.resolve('todo goood: ');
  }

  async updateOneDataMicrosip(data:any,httpService:HttpAxiosService):Promise<any>{
    console.log('todo goood: ',data['id_user_mod']," ",data['id_window']," ",data['data']);
    
      //logica de negocio
      const dataReturn = await httpService.postMicrosip(
        'Quotation/updateProductOrder',
        {
          request:"1234",
          references:data.data
        }
      );
      if(dataReturn.data.status != "200"){
        //Evento disparar requotProveedor
        this.socket.socket.emit('triggerOneUpdate', {
          "idUser":data['id_user_mod'],
          "id_window":data['id_window'],
          "sku":data['data'][0],
        });
        return Promise.reject('Error al obtener información de los artículos Microsip');
      }
      const dataUpdate = {
        dataProd:dataReturn.data.data,
        idUser:data['id_user_mod'],
        id_window:data['id_window'],
        sku:data['data'][0],
      }
      //Endpoint Node actualizar artículos de microsip
      const resNode:any = await httpService.postNode('api/microsip/updateOneDataMicrosip',dataUpdate);
      
      if(resNode.status != 'success'){
        return Promise.reject(
          `Error al actualizar iformación de los artículos Microsip`,
        );
      }
      
      return Promise.resolve('todo goood: ');
  }

  listPrices(costo: number): { precio: number; margen: number }[] {
    let comision: number[] = [];
    const listaPrecios: any[] = [];
    costo = parseFloat(costo.toString());
    if (costo >= 0 && costo <= 80) {
      comision = [50, 41, 33, 25, 13, 0.01, 5];
    } else if (costo >= 80.01 && costo <= 160) {
      comision = [48, 40, 33, 20, 13, 0.01, 5];
    } else if (costo >= 160.01 && costo <= 320) {
      comision = [40, 30, 21, 17, 9, 0.01, 5];
    } else if (costo >= 320.01 && costo <= 640) {
      comision = [33, 28, 21, 17, 9, 0.01, 5];
    } else if (costo >= 640.01 && costo <= 1280) {
      comision = [33, 23, 19, 15, 9, 0.01, 5];
    } else if (costo >= 1280.01 && costo <= 2560) {
      comision = [28, 20, 16, 13, 9, 0.01, 5];
    } else if (costo >= 2560.01 && costo <= 5120) {
      comision = [24, 18, 16, 12, 9, 0.01, 5];
    } else if (costo >= 5120.01 && costo <= 10240) {
      comision = [19, 16, 13, 11, 9, 0.01, 5];
    } else if (costo >= 10240.01) {
      comision = [17, 13, 9, 0.07, 0.09, 0.01, 5];
    }
    //Recorrer el arrayComision para formar el objeto
    let contador = 1;
    for (const margen of comision) {
      const precio = costo / (100 / margen) + costo;
      listaPrecios.push({ precio: precio, margen: margen });
      contador = contador + 1;
    }

    return listaPrecios;
  }

  handlerSaleOnlineToMicrosip = async (element:any,httpService:HttpAxiosService,knexConn:KnexconnectionService)=>{
      try{
          //Emitir evento socket empezo con un pedido
          console.log("Entro al insert Creditienda y Cyberpuerta")
          const resultOrder = await this.insertEvent(element,httpService,knexConn);
          //Emitir evento socket finalizo con exito
      }
      catch(error){
          console.log(error);
          //Emitir evento socket error
      }
  }

  async insertEvent(
      data:any,
      httpService:HttpAxiosService,
      knex:KnexconnectionService
  ):Promise<any>
  {

      /* const orderReference = await knex.knexQuery('order_paids')
          .first('order_number')
          .where('id',data.id_order)       
      console.log(orderReference.order_number)
      return true; */
    
      const dataSeller = await httpService.postMicrosip(
          "Seller/createSeller",
          {
              request_token:"1234",
              name:data.seller_name,
          });
      //validar respuesta
      if(dataSeller.data.status == "400"){
          return Promise.reject("Error seller MICROSIP")
      }
      //Obtener el id del vendedor
      const _idSellerMS = dataSeller.data.id_seller;
      //Obtener id del cliente cyberpuerta 25283 ventas plublico 24547
      const _idCustomerMS = data.customerMsId;

      const orderReference = data.order_number
      
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
          let priceProduct = '0';
          if(data.seller_name == 'CREDITIENDA'){
              //console.log("tipo de dato: ",typeof product.price, product.price)
              priceProduct = Number(product.price).toFixed(2);
          }
          else{
              priceProduct = Number(product.price).toFixed(2);
          }
          
          const costo = Number(product.cost).toFixed(2);
          arraySupplier.push(product.id_supplier);
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
          descrip:orderReference + " - " +orderRef,
          arrayNotas:arrayNotes.join("|"),
          orderNumberMS:orderReference,
          nameArray:arrayName.join("|"),
          CheckProdMS:arrayCreate.join("|"),
          cond_id:data.condId.toString(),
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
      await knex.knexQuery('shoppings')
      .where('order_reference',orderReference)
      .update({
      folio_ms: insertedOrder.data.folio
      })
      console.log(insertedOrder.data);
      return Promise.resolve(`Pedido agregado con exito: ${data.order_reference}`);
  }
  @OnEvent('order.addSku')
  async findSkuEvent(id_cart:any){
    console.log("inicio order.addSku",id_cart);
    /**Traer información del Pedido*/
    const resNodeSku = await this.httpService.postNode("api/microsip/findSku",{id_cart:id_cart});
    //console.log(resNodeSku);
    if(resNodeSku.status == "error"){
      //informar del error para repetir el proceso
    }
    /*Mandar preguntar por los SKU a Microsip*/
    const jsonRequest = JSON.stringify(resNodeSku.skusId);
    //console.log(jsonRequest);
    const skusMicrosip = await this.httpService.postMicrosip("Quotation/findSku",{
      "token":"1234",
      "skusId":jsonRequest,
      "skus":resNodeSku.skus
    });
    if(skusMicrosip.status != 200){
      //guardar en logs id cart
    }
    /**Devolver los SKU de microsip al cotifast*/
    const resNode = await this.httpService.postNode('api/microsip/insertSku',{"arraySku":skusMicrosip.data.arraySku})
  }
}
