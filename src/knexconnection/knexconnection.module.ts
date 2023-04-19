import { Module } from '@nestjs/common';
import { KnexconnectionService } from './knexconnection/knexconnection.service';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  providers: [KnexconnectionService],
  exports: [KnexconnectionService],
  imports: [LoggerModule]
})
export class KnexconnectionModule {
  
}
