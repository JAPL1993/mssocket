import { Module } from '@nestjs/common';
import { HttpAxiosService } from './http-axios/http-axios.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [HttpAxiosService],
  imports: [HttpModule],
  exports: [HttpAxiosService],
})
export class HttpAxiosModule {}
