import { Module } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { PermissionsSeedModule } from '../permissions-seed/permissions-seed.module';

@Module({
  imports: [PermissionsSeedModule],
  providers: [AgenciesService],
  controllers: [AgenciesController],
  exports: [AgenciesService],
})
export class AgenciesModule {}
