'use strict';
const CustomRedis = require('./customRedis');
const config = require('../config');
const logger = require('./logger');
const DomainLocalResolveIp = require('../logic/domainLocalResolveIp');

class NetworkIP{
    constructor(){
        try{
            this.cacheDataTime = 0;
            this.cacheDataExpire = 300*1000;
            this.cacheData = [];
            this.redisKey = 'Network:DnsServer';
            this.CustomRedis = CustomRedis;
            this.DomainLocalResolveIp = new DomainLocalResolveIp();
        }catch (err){
            console.log('NetworkIP.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 获取有效的DNS服务器IP
     * @returns {Promise<*>}
     */
    async getIPList(){
        try{
            let time = new Date().getTime();
            if(this.cacheData.length > 0 && this.cacheDataTime+this.cacheDataExpire >= time){
                return this.cacheData;
            }
            let result = await this.CustomRedis.get(this.redisKey);
            if(!result){
                return [];
            }
            let list = JSON.parse(result);
            this.cacheData = [];
            for(let i=0;i<list.length;i++){
                if(!('ip' in list[i]) || !('server' in list[i])){
                    continue;
                }
                this.cacheData.push({
                    ip: list[i].ip,
                    server: list[i].server,
                });
            }
            this.cacheDataTime = time;
            return this.cacheData;
        }catch (err){
            console.log('NetworkIP.getIPList');
            logger.error(err);
            err = null;
        }
    }

    /**
     * IP地址转INT型
     * @param ip
     * @returns {number}
     */
    ipToInt(ip) {
        try{
            let ips = 0, numbers = ip.split(".");
            //等价上面
            for (let i = 0; i < 4; ++i) {
                ips = ips << 8 | parseInt(numbers[i]);
            }
            return ips;
        }catch (err){
            console.log('NetworkIP.ipToInt');
            logger.error(err);
            err = null;
        }
    }

    /**
     * INT型IP转字符串
     * @param number
     * @returns {string|*}
     */
    intToIp(number){
        try{
            let ip = [];
            for (let i = 3; i >= 0; i--) {
                ip[i] = number & 0xff;
                number = number >> 8;
            }
            return ip.join(".");
        }catch (err){
            console.log('NetworkIP.intToIp');
            logger.error(err);
            err = null;
        }
        return null;
    }

    /**
     * 获取IP端范围
     * @param ip
     * @returns {*[]}
     */
    getRange(ip){
        try{
            let min = 0;
            let max = 0;
            if(ip.indexOf('/') > 0 && ip.indexOf('-') < 0){  //IP掩码段
                let [ipstr, maskstr] = ip.split('/');
                ip = this.ipToInt(ipstr);
                let mark = 0xFFFFFFFF << (32 - parseInt(maskstr)) & 0xFFFFFFFF;
                min = ip & mark;
                max = ip | (~mark) & 0xFFFFFFFF;
            }else if(ip.indexOf('/') < 0 && ip.indexOf('-') > 0){  //IP段范围
                let [minipstr, maxipstr] = ip.split('-');
                if(maxipstr.indexOf('.') > 0){  //x.x.x.x-x.x.x.x
                    min = this.ipToInt(minipstr);
                    max = this.ipToInt(maxipstr);
                }else{  //x.x.x.x-x
                    min = this.ipToInt(minipstr);
                    max = min + parseInt(maxipstr);
                }
            }else{  //单IP
                min = this.ipToInt(ip);
                max = min;
            }
            return [min, max];
        }catch (err){
            console.log('NetworkIP.getRange');
            logger.error(err);
            err = null;
        }
        return [];
    }

    /**
     * 检查并且获取匹配的DNS服务器IP
     * @param ipAddress
     * @returns {Promise<*>}
     */
    async check(ipAddress){
        try{
            let list = await this.getIPList();
            if(list.length <= 0){
                return config.dns.default;
            }
            let ipInt = this.ipToInt(ipAddress.toString().trim());
            for(let i=0;i<list.length;i++){
                let result = this.getRange(list[i].ip);
                if(!result || result.length !== 2){
                    continue;
                }
                if(ipInt >= result[0] && ipInt <= result[1]){
                    return list[i].server;
                }
            }
            return config.dns.default;
        }catch (err){
            console.log('NetworkIP.check');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 获取外网DNS地址
     * @param domain
     * @param ipAddress
     * @returns {*}
     */
    async get(domain, ipAddress){
        try{
            let serverIp = await this.DomainLocalResolveIp.getLocalIp(domain);
            if(serverIp !== false){
                return serverIp;
            }
            return await this.check(ipAddress);
        }catch(err){
            console.log('NetworkIP.get');
            logger.error(err);
            err = null;
        }
        return [];
    }
}

module.exports = NetworkIP;
