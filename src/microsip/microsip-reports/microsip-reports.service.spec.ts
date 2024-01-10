import { Test, TestingModule } from '@nestjs/testing';
import { MicrosipReportsService } from './microsip-reports.service';

describe('MicrosipReportsService', () => {
  let service: MicrosipReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MicrosipReportsService],
    }).compile();

    service = module.get<MicrosipReportsService>(MicrosipReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
