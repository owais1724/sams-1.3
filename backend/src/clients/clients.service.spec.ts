import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(() => {
    service = new ClientsService({} as any, {} as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
