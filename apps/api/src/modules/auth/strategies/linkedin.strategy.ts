import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
import { AuthService } from '../auth.service';

const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  private readonly logger = new Logger(LinkedInStrategy.name);

  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('linkedin.clientId') ?? '',
      clientSecret: config.get<string>('linkedin.clientSecret') ?? '',
      callbackURL: config.get<string>('linkedin.callbackUrl') ?? 'http://localhost:3001/api/auth/linkedin/callback',
      scope: ['openid', 'profile', 'email'],
    });
  }

  // passport-linkedin-oauth2 uses query-param auth which LinkedIn rejects.
  // Fetch userinfo directly with Authorization: Bearer header instead.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userProfile(accessToken: string, done: (err: Error | null, profile?: any) => void): void {
    fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          this.logger.error(`userinfo HTTP ${res.status}`);
          return done(new Error('Failed to fetch user profile'));
        }
        return res.json().then((json: Record<string, string>) => {
          this.logger.debug('LinkedIn userinfo: ' + JSON.stringify(json));
          done(null, {
            id: json['sub'],
            displayName: json['name'] ?? `${json['given_name'] ?? ''} ${json['family_name'] ?? ''}`.trim(),
            emails: json['email'] ? [{ value: json['email'] }] : [],
            photos: json['picture'] ? [{ value: json['picture'] }] : [],
            _json: json,
          });
        });
      })
      .catch((err: Error) => {
        this.logger.error('userinfo fetch error: ' + err.message);
        done(new Error('Failed to fetch user profile'));
      });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: any,
  ) {
    const json = profile._json ?? {};
    const linkedinId: string = profile.id ?? '';
    const name: string = profile.displayName ?? '';
    const email: string = profile.emails?.[0]?.value ?? json['email'] ?? '';
    const profilePictureUrl: string | undefined = profile.photos?.[0]?.value ?? undefined;

    this.logger.log(`LinkedIn auth — id: ${linkedinId}, email: ${email}, name: ${name}`);

    if (!linkedinId) {
      throw new Error('Could not extract LinkedIn user ID from profile');
    }

    return this.authService.validateLinkedInUser({
      linkedinId,
      name,
      email,
      profilePictureUrl,
      accessToken,
      refreshToken,
    });
  }
}
