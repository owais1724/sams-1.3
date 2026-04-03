import { AgenciesController } from './agencies.controller';

describe('AgenciesController', () => {
  let controller: AgenciesController;

  beforeEach(() => {
    controller = new AgenciesController({} as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
