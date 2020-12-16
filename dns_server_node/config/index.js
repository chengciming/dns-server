'use strict';

/**
 * Module dependencies.
 */
const path = require('path');
const _ = require('lodash');

let env = process.env.APP_ENV || 'dev';
env = env.toLowerCase();

let file = path.resolve(__dirname, env + '.js');
let commonFile = path.resolve(__dirname, 'common.js');
let allConfig = {};

allConfig.env = env;

let config = {};

try {
    let envConfig = require(file);
    let commonConfig = require(commonFile);
    config = _.assign(config, envConfig);
    config = _.assign(config, allConfig);
    config = _.assign(config, commonConfig);
    console.log('Load config: [%s] %s', env, file);
} catch (err) {
    console.error('Cannot load config: [%s] %s', env, file);
    throw err;
}
module.exports = config;
