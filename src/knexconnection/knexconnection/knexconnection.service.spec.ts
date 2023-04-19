import { Test, TestingModule } from '@nestjs/testing';
import { KnexconnectionService } from './knexconnection.service';

describe('KnexconnectionService', () => {
  let service: KnexconnectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KnexconnectionService],
    }).compile();

    service = module.get<KnexconnectionService>(KnexconnectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
