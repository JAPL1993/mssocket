import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { LoggerService } from 'src/logger/logger/logger.service';
import { KnexconnectionService } from 'src/knexconnection/knexconnection/knexconnection.service';
import { HttpAxiosModule } from 'src/http-axios/http-axios.module';
@Module({
  controllers: [ApiController],
  providers: [ApiService, LoggerService, KnexconnectionService],
  imports: [HttpAxiosModule]
})
export class ApiModule {}
