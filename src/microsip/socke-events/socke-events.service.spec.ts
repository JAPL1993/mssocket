import { Test, TestingModule } from '@nestjs/testing';
import { SockeEventsService } from './socke-events.service';

describe('SockeEventsService', () => {
  let service: SockeEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SockeEventsService],
    }).compile();

    service = module.get<SockeEventsService>(SockeEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
