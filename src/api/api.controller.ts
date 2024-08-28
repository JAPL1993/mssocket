import { Controller, Request, Param, Body, Post, Get } from '@nestjs/common';
import { ApiService } from './api.service';
import { EntregadoEstatusService } from 'src/microsip/entregado-estatus/entregado-estatus.service';
import { Cron } from '@nestjs/schedule';
require('dotenv').config();
@Controller('api')
export class ApiController {
    constructor(
        private apiService: ApiService,
        //private entregadoService: EntregadoEstatusService
    ){}

    @Get('/createClientsMicrosip')
    @Cron('0 */06 * * * *', {
        disabled: process.env.ENVIRONMENT == "produccion" ? false : true
    })
    async createClientMS(){
        console.log("actualizar clientes")
        const customerMS = await this.apiService.createClientsMS();
        return customerMS
    }

    @Get('/createListaMetodoCobro')
    @Cron('0 */06 * * * *', {
        disabled: process.env.ENVIRONMENT == "produccion" ? false : true
    })
    async createFormaCobro(){
        const formasCobroMS = await this.apiService.createFormaCobro();
        return formasCobroMS
    }
    /* @Get('/rollbackPedidos')
    async rollbackPedidos(){
        const customerMS = await this.entregadoService.rollbackPedidosEntregado();
        return customerMS
    } */
}
