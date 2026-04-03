import { DesignationsService } from './designations.service';

describe('DesignationsService', () => {
  let service: DesignationsService;

  beforeEach(() => {
    service = new DesignationsService({} as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
