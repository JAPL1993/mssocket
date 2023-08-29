import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
//import { ProductsService } from './microsip/products/products.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    /* private readonly microsipProducts: ProductsService */) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /* @Get('microsip/createProducts')
  createProducts(){
    return this.microsipProducts.insertProduct()
  } */

  

}
