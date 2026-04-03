import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  let service: EmployeesService;

  beforeEach(() => {
    service = new EmployeesService({} as any, {} as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
