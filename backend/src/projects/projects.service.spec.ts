import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(() => {
    service = new ProjectsService({} as any, {} as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
