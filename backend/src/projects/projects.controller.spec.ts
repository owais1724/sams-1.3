import { ProjectsController } from './projects.controller';

describe('ProjectsController', () => {
  let controller: ProjectsController;

  beforeEach(() => {
    controller = new ProjectsController({} as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
