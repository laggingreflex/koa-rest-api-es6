'use strict';

import passport from 'koa-passport';
import jwt from 'jsonwebtoken';
import oauth2orize from 'oauth2orize-koa';
import compose from 'koa-compose';
import Client from '../client/client.model';
import User from '../user/user.model';
import RefreshToken from './model/refresh-token';
import logger from '../../utils/logger';
import _debug from 'debug';
import config from './config';

const debug = _debug('krs:auth.oauth2');
const log = logger(module);

const server = oauth2orize.createServer();

server.serializeClient(client => client._id);
server.deserializeClient(async(id) => await Client.findById(id));

/**
 * Creates jwt token and refresh token
 *
 * @param {Object} user - The user object
 * @param {String} user._id - The user id
 * @param {String} user.email - The user email
 * @param {Object} client - The client object
 * @param {String} client._id - The client id
 */
async function generateTokens(user, client) {
  if (!user || !client) return false;

  const jwtToken = jwt.sign({ id: user._id, email: user.email },
    config.secret, { expiresIn: config.tokenExpiration });

  await RefreshToken.findOneAndRemove({ user: user._id });

  const refreshToken = await RefreshToken.create({
    user: user._id,
    client: client._id
  });

  return [jwtToken, refreshToken.token, { expires_in: config.tokenExpiration }];
}
server.exchange(oauth2orize.exchange.password(async(client, email, password) => {
  if (!client.trusted) return false;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return false;
    debug('Valid credentials');
    return await generateTokens(user, client);
  } catch (err) {
    log.error(err);
  }
  return false;
}));

server.exchange(oauth2orize.exchange.refreshToken(async(client, refreshToken) => {
  if (!client.trusted) return false;

  debug('Start refresh token exchange for client --> %s', client._id);

  try {
    const refToken = await RefreshToken.findOne({ token: refreshToken, client: client._id });
    if (!refToken) {
      debug('Refresh token not found');
      return false;
    }

    debug('Refresh token found');
    const user = await User.findById(refToken.user);

    if (!user) {
      debug('User token found --> %s', refToken.user);
      return false;
    }

    return await generateTokens(user, client);
  } catch (err) {
    log.error(err);
  }
  return false;
}));

export function token() {
  return compose([
    passport.authenticate(['client-basic', 'client-password'], { session: false }),
    async(ctx, next) => {
      ctx.state.user = ctx.passport.user;
      await next();
    },
    server.token(),
    server.errorHandler()
  ]);
}