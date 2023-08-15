import { Controller, Get } from '@nestjs/common';
import { CyberPuertaService } from './cyber-puerta.service';

@Controller()
export class cyberPuertaController {
    constructor(
    private readonly cyberPuerta: CyberPuertaService
    ) {}

    @Get('cyberpuerta/invoices')
    invoices() {
    return this.cyberPuerta.cyberpuertaInvoices();
    }

}
