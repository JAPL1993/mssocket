import { Controller, Request, Param, Body, Post, Get } from '@nestjs/common';
import { ApiService } from './api.service';
import { EntregadoEstatusService } from 'src/microsip/entregado-estatus/entregado-estatus.service';

@Controller('api')
export class ApiController {
    constructor(
        private apiService: ApiService,
        //private entregadoService: EntregadoEstatusService
    ){}

    @Get('/createClientsMicrosip')
    async createClientMS(){
        const customerMS = await this.apiService.createClientsMS();
        return customerMS
    }
    /* @Get('/rollbackPedidos')
    async rollbackPedidos(){
        const customerMS = await this.entregadoService.rollbackPedidosEntregado();
        return customerMS
    } */
}
