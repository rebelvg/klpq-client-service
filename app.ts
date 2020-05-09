import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as passport from 'koa-passport';
import * as OAuth2Strategy from 'passport-oauth2';
import * as http from 'http';
import axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';

import { server as serverConfig, twitch } from './config';
import { publishTwitchUser, publishKlpqUser } from './socket-server';
import { youtubeClient } from './clients';

export interface ITwitchUser {
  accessToken: string;
  refreshToken: string;
}

declare module 'koa' {
  interface Context {
    state: {
      user: ITwitchUser;
      [key: string]: any;
    };
  }
}

declare module 'koa-router' {
  interface IRouterContext {
    state: {
      user: ITwitchUser;
      [key: string]: any;
    };
  }
}

export const app = new Koa();

export const server = http.createServer(app.callback());

app.use(passport.initialize());

passport.use(
  'twitch',
  new OAuth2Strategy(
    {
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      clientID: twitch.clientId,
      clientSecret: twitch.clientSecret,
      callbackURL: twitch.callbackUrl,
    },
    function (accessToken, refreshToken, profile, done) {
      const user = {
        accessToken,
        refreshToken,
      };

      done(null, user);
    }
  )
);

app.proxy = true;

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = { error: error.message };
  }
});

const router = new Router();

router.get(
  '/auth/twitch',
  async (ctx, next) => {
    const { requestId } = ctx.query;

    if (!requestId) {
      throw new Error('no_request_id');
    }

    await next();
  },
  async (ctx, next) => {
    const { requestId } = ctx.query;

    ctx.cookies.set('requestId', requestId);

    await next();
  },
  passport.authenticate('twitch', { session: false, scope: 'user_read' })
);

router.get(
  '/auth/twitch/callback',
  passport.authenticate('twitch', { session: false }),
  (ctx: Router.IRouterContext, next: Koa.Next) => {
    const requestId = ctx.cookies.get('requestId');
    const { user } = ctx.state;

    publishTwitchUser(requestId, user);

    ctx.body = 'sign_in_successful';
  }
);

router.get(
  '/auth/twitch/refresh',
  async (ctx, next) => {
    const { refreshToken } = ctx.query;

    if (!refreshToken) {
      throw new Error('no_refresh_token');
    }

    await next();
  },
  async (ctx, next) => {
    const { refreshToken } = ctx.query;

    const params = new URLSearchParams();

    params.append('client_id', twitch.clientId);
    params.append('client_secret', twitch.clientSecret);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const { data } = await axios.post('https://id.twitch.tv/oauth2/token', params);

    ctx.body = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }
);

router.get('/youtube/channels', async (ctx, next) => {
  const { channelName } = ctx.query;
  const jwt = ctx.get('jwt');

  jsonwebtoken.verify(jwt, serverConfig.jwtSecret);

  ctx.body = await youtubeClient.getChannels(channelName);
});

router.get('/youtube/streams', async (ctx, next) => {
  const { channelId } = ctx.query;
  const jwt = ctx.get('jwt');

  jsonwebtoken.verify(jwt, serverConfig.jwtSecret);

  ctx.body = await youtubeClient.getStreams(channelId);
});

router.get('/auth', async (ctx, next) => {
  const jwt = jsonwebtoken.sign({ isLoggedIn: true }, serverConfig.jwtSecret, { expiresIn: '1d' });

  ctx.body = {
    jwt,
  };
});

app.use(router.routes());

app.use((ctx) => {
  ctx.throw(404);
});
