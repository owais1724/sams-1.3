import { DesignationsController } from './designations.controller';

describe('DesignationsController', () => {
  let controller: DesignationsController;

  beforeEach(() => {
    controller = new DesignationsController({} as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
