'use strict';
const logger = require('../library/logger');
const config = require('../config');
const Redis = require('ioredis');

try{
    const redisObj = new Redis(config.redis.cache);
    redisObj.on('error', function(error){
        console.log('Cache Redis.error');
        logger.error(error);
    });
    redisObj.on('connect', function(){
        console.log('Cache Redis connected.');
    });
    module.exports = redisObj;
}catch (e) {
    module.exports = null;
    logger.error(e);
}
