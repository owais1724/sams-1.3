import { Module } from '@nestjs/common';
import { PermissionsSeedService } from './permissions-seed.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [PermissionsSeedService],
    exports: [PermissionsSeedService],
})
export class PermissionsSeedModule { }
