import { Test, TestingModule } from '@nestjs/testing';
import { EntregadoEstatusService } from './entregado-estatus.service';

describe('EntregadoEstatusService', () => {
  let service: EntregadoEstatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntregadoEstatusService],
    }).compile();

    service = module.get<EntregadoEstatusService>(EntregadoEstatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
