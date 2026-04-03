import { ClientsController } from './clients.controller';

describe('ClientsController', () => {
  let controller: ClientsController;

  beforeEach(() => {
    controller = new ClientsController({} as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
