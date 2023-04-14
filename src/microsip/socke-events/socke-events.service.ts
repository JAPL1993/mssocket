import { Injectable, Inject } from '@nestjs/common';
import { HttpAxiosService } from 'src/http-axios/http-axios/http-axios.service';
import { SocketService } from 'src/socket/socket/socket.service';

@Injectable()
export class SockeEventsService {
  //Constructor
  constructor(
    @Inject(SocketService) private readonly socket: SocketService,
    @Inject(HttpAxiosService) private httpService: HttpAxiosService,
  ) {
    const handlers = {
      insertFolio: this.handlerInsertFolio,
    };
    Object.keys(handlers).forEach((eventName) => {
      const handler = handlers[eventName];
      socket.socket.on(eventName, (data: any) => handler(data, httpService));
    });
  }
  //Handler Events
  handlerInsertFolio = (data: any, httpService: HttpAxiosService) => {
    httpService
      .postNode('api/shoppingCart/cartSearch', data)
      .then((respose) => {
        this.msInsertFolio(respose.data.data, httpService)
          .then((result) => console.log(result))
          .catch((result) => console.log(result));
      })
      .catch((error) => console.log(error));
  };
  //Methods for inserction
  async msInsertFolio(data: any, httpService: HttpAxiosService): Promise<any> {
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
    const microsipDescription = `${id_cart} | ${description}`;
    const sellerName =
      `${seller.name_seller} ${seller.last_name_seller}`.toLocaleUpperCase();
    const idCustomerMS = customer.id_customer_microsip;
    const sellerData = { request_token: '1234', name: sellerName };
    console.log(
      '##############################################################################################',
    );
    console.log(' ');
    console.log(`Staring... fetching API Microsip createSeller`);
    const insertedSeller: any = await httpService.postMicrosip(
      'Seller/createSeller',
      sellerData,
    );
    if (insertedSeller == undefined) {
      console.log('undefined');
      return Promise.reject(
        `There was an error creating or getting the seller for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    if (
      insertedSeller.status == '400' ||
      insertedSeller.status == 'error' ||
      insertedSeller.status == 400 ||
      insertedSeller.status == undefined
    ) {
      return Promise.reject(
        `There was an error creating or getting the seller for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    console.log(
      `${insertedSeller.data.msg}, id_Seller: ${insertedSeller.data.id_seller}`,
    );
    const id_seller = insertedSeller.data.id_seller;
    console.log(`Staring... fetching API Microsip insertCustomerNode`);
    const customerData = {
      request_token: '1234',
      id_customer_microsip: idCustomerMS,
    };
    const insertedCustomer: any = await httpService.postMicrosip(
      'Quotation/insertCustomerNode',
      customerData,
    );
    if (insertedCustomer == undefined) {
      console.log('undefined');
      return Promise.reject(
        `There was an error creating or getting the customer for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    if (
      insertedCustomer.status == '400' ||
      insertedCustomer.status == 'error' ||
      insertedCustomer.status == 400 ||
      insertedCustomer.status == undefined
    ) {
      return Promise.reject(
        `There was an error creating or getting the customer for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    console.log(`${insertedCustomer.data.msg}`);
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
      // descrip = descrip + " | Nombre: " + name_Product + " - NumPartFab: "+ reference;
      const listaPricesMS = this.listPrices(objAux[product]['cost_product']);
      // recorrer el array de precios para insertar al articulo en MS
      for (const row of listaPricesMS) {
        const rprice = Number(row['precio']).toFixed(2);
        const rmargin = Number(row['margen']).toFixed(2);
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
      // sys.exit();
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
      console.log(
        '######### Consumiendo API Microsip Quotation/insertProductNode ##############',
      );
      console.log('');
      const insertedProduct: any = await httpService.postMicrosip(
        'Quotation/insertProductNode',
        dProduct,
      );
      if (insertedProduct == undefined) {
        console.log('undefined');
        return Promise.reject(
          `There was an error creating or getting the product for id_cart: ${id_cart} the error can be found in the log file`,
        );
      }
      if (
        insertedProduct.status == '400' ||
        insertedProduct.status == 'error' ||
        insertedProduct.status == 400 ||
        insertedProduct.status == undefined
      ) {
        return Promise.reject(
          `There was an error creating or getting the product for id_cart: ${id_cart} the error can be found in the log file`,
        );
      }
      console.log(insertedProduct.data.msg);
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
    console.log(
      '######### Consumiendo API Microsip Quotation/createQuotation ##############',
    );
    console.log(dataQuot);
    console.log('');
    const insertedQuot: any = await httpService.postMicrosip(
      'Quotation/createQuotation',
      dataQuot,
    );
    if (insertedQuot == undefined) {
      console.log('undefined');
      return Promise.reject(
        `There was an error creating or getting the Quotation for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    if (
      insertedQuot.status == '400' ||
      insertedQuot.status == 'error' ||
      insertedQuot.status == 400 ||
      insertedQuot.status == undefined
    ) {
      return Promise.reject(
        `There was an error creating or getting the Quotation for id_cart: ${id_cart} the error can be found in the log file`,
      );
    }
    console.log(insertedQuot.data);
    console.log(' ');
    const dataResponse = {
      id_cart: id_cart,
      folio: insertedQuot.data.folio,
      id_user: id_user,
    };
    const insertedNode: any = await httpService.postNode(
      'api/shoppingCart/insertDataMS',
      {
        response_array: [dataResponse],
        response_error: [],
      },
    );
    if (insertedNode == undefined) {
      console.log('undefined');
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
    console.log(insertedNode.data);
    console.log(' ');
    return Promise.resolve(`The Folio has been insert successfuly`);
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
      comision = [17, 13, 9, 8, 7, 0.01, 5];
    }

    //Recorrer el arrayComision para formar el objeto
    let contador = 1;
    for (const margen of comision) {
      const precio = costo / (100 / margen) + costo;
      listaPrecios.push({ name: precio, margen: margen });
      contador = contador + 1;
    }

    return listaPrecios;
  }
}
