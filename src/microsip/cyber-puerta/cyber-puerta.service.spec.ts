import { Test, TestingModule } from '@nestjs/testing';
import { CyberPuertaService } from './cyber-puerta.service';

describe('CyberPuertaService', () => {
  let service: CyberPuertaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CyberPuertaService],
    }).compile();

    service = module.get<CyberPuertaService>(CyberPuertaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
