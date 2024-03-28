import { Controller, Request, Param, Body, Post, Get } from '@nestjs/common';
import { ApiService } from './api.service';

@Controller('api')
export class ApiController {
    constructor(
        private apiService: ApiService
    ){}

    @Get('/createClientsMicrosip')
    async createClientMS(){
        console.log("createClientsMicrosip");
        return ""
    }
}
