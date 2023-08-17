import { Controller, Get } from '@nestjs/common';
import { CyberPuertaService } from './cyber-puerta.service';
import {Cron} from '@nestjs/schedule';
@Controller()
export class cyberPuertaController {
    constructor(
    private readonly cyberPuerta: CyberPuertaService
    ) {}

    @Get('cyberpuerta/invoices')
    //@Cron('0 00,30 13,18 * * *')
    invoices() {
    return this.cyberPuerta.cyberpuertaInvoices();
    }

}
