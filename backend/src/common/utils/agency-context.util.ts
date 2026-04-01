import { ForbiddenException } from '@nestjs/common';

type AgencyScopedRequest = {
  user?: {
    agencyId?: string | null;
  };
};

export function requireAgencyContext(req: AgencyScopedRequest): string {
  const agencyId = req.user?.agencyId;

  if (!agencyId) {
    throw new ForbiddenException('Agency context required');
  }

  return agencyId;
}
