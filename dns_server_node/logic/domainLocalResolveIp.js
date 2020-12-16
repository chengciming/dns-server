'use strict';
const logger = require('../library/logger');
const CustomRedis = require('../library/customRedis');
const broad = require('./broad');

class DomainLocalResolveIp {
    constructor() {
        try {
            this.DomainLocalSuffix = 'DomainLocalRelosve:';
            this.broadObj = new broad();
            this.CustomRedis = CustomRedis;
        } catch (err) {
            console.log('DomainLocalResolveIp.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 根据域名获取解析的DNS服务器IP
     * @param domain
     * @returns {string[]}
     */
    async getLocalIp(domain) {
        try{
            if(!domain || domain.length <= 0){
                return false;
            }
            let redisKey = await this.broadObj.checkKey(this.CustomRedis, this.DomainLocalSuffix, domain);
            if(!redisKey){
                return false;
            }
            let serverIp = await this.CustomRedis.get(redisKey);
            if(!serverIp){
                return false;
            }
            serverIp = JSON.parse(serverIp);
            if('server_ip' in serverIp && serverIp.server_ip.length > 0){
                return serverIp.server_ip;
            }
        }catch (err){
            console.log('DomainLocalResolveIp.getLocalIp');
            logger.error(err);
            err = null;
        }
        return false;
    }
}

module.exports = DomainLocalResolveIp;
