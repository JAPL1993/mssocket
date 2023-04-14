import { Test, TestingModule } from '@nestjs/testing';
import { HttpAxiosService } from './http-axios.service';

describe('HttpAxiosService', () => {
  let service: HttpAxiosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpAxiosService],
    }).compile();

    service = module.get<HttpAxiosService>(HttpAxiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
