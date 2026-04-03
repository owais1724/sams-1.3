import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(() => {
    service = new RolesService({} as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
