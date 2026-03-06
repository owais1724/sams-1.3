import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from HTTP-only cookie (works on all browsers via the Next.js reverse proxy)
        (request: any) => {
          return request?.cookies?.access_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Return user info with permissions
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      agencyId: payload.agencyId,
      agencySlug: payload.agencySlug || null,
      employeeId: payload.employeeId,
      permissions: payload.permissions || [],
    };
  }
}
