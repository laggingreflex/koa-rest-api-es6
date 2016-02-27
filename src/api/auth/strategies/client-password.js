'use strict';

import debug from 'debug';
import { Strategy } from 'passport-oauth2-client-password';
import Client from '../../client/client.model';

const log = debug('krs:auth.strategies.client-password');

export default new Strategy((id, secret, done) => {
  (async() => {
    try {
      log('Finding client : %s', id);
      const client = await Client.findOne({ id });

      if (!client) {
        return done(null, false);
      }

      if (secret !== client.secret) {
        log('Client %s unauthorized!', id);
        return done(null, false);
      }
      log('Client %s authorized!', id);
      return done(null, client);
    } catch (error) {
      return done(error);
    }
  })();
});
