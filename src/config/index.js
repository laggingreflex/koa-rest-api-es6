'use strict';

import dotenv from 'dotenv';
dotenv.config({ silent: process.env.NODE_ENV !== 'development' });

const config = Object.freeze({

  environment: process.env.NODE_ENV || 'development',
    // Server settings
  server: {
      host: '0.0.0.0',
      port: process.env.NODE_PORT || process.env.PORT || 3000
    }
});

export default config;
