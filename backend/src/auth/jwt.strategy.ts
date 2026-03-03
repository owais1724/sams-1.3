import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // ── 1. Cookie (desktop browsers, same-domain) ─────────────────────
        (request: any) => {
          return request?.cookies?.access_token || null;
        },
        // ── 2. Authorization: Bearer header (mobile browsers, cross-domain) ─
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
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
