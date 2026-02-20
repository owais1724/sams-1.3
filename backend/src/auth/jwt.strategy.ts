import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          const token = request?.cookies?.access_token;
          const isProd = process.env.NODE_ENV === 'production';
          if (!isProd) {
            if (token) {
              console.log('[JwtStrategy] Token extracted from cookie');
            } else {
              console.log('[JwtStrategy] No access_token cookie found');
            }
          }
          return token;
        },
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
      employeeId: payload.employeeId,
      permissions: payload.permissions || [],
    };
  }
}
