'use strict';
const utils = require('../library/utils');
const dns = require('native-dns');
const logger = require('../library/logger');
const CacheRedis = require('../library/cacheRedis');
const DnsCacheParse = require('../library/dnsCacheParse');
const NetworkIP = require('../library/networkIP');
const DnsServer = require('./dnsServer');

class NetworkHosts{
    constructor(){
        try{
            this.cacheSuffix = 'DnsCache:';
            this.CacheRedis = CacheRedis;
            this.DnsServer = new DnsServer();
            this.DnsCacheParse = new DnsCacheParse();
            this.NetworkIP = new NetworkIP();
            this.timeoutDomainCount = {};
            let parentobj = this;
            setInterval(function(){
                try{
                    let time = new Date().getTime();
                    for(let key in parentobj.timeoutDomainCount){
                        if(time - parentobj.timeoutDomainCount.time > 120000){
                            delete parentobj.timeoutDomainCount[key];
                        }
                    }
                }catch (err){
                    console.log('NetworkHosts.constructor.setInterval');
                    logger.error(err);
                    err = null;
                }
            }, 120000);
        }catch (err){
            console.log('NetworkHosts.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 处理网络解析
     * @param client
     * @param id
     * @param address
     * @param question
     * @returns {boolean}
     */
    async request(client, id, address, question) {
        try{
            let domain = question.name;
            let typeName = utils.getName(question.type);
            if(typeName === false){
                return false;
            }
            return await this.networkRequest(client, id, address, domain, typeName);
        }catch (err){
            console.log('NetworkHosts.request');
            logger.error(err);
            err = null;
        }
        question = null;
        return true;
    }

    /**
     * 请求远程DNS服务器
     * @param client
     * @param id
     * @param address
     * @param domain
     * @param typeName
     * @returns {boolean}
     */
    async networkRequest(client, id, address, domain, typeName){
        try{
            let cache = await this.getCache(domain, typeName);
            if(cache){
                //console.log('['+process.pid+']', domain, typeName, (new Date().getTime()-time)+'ms', 'Cache');
                client.response.answer.rcode = cache.rcode;
                client.response.answer.answer = utils.makeDnsData(cache.answer);
                client.response.answer.authority = utils.makeDnsData(cache.authority);
                client.response.answer.additional = utils.makeDnsData(cache.additional);
                client.socket.send('answer', JSON.stringify(client.response));
                client = null;
                id = null;
                domain = null;
                typeName = null;
            }else{
                let dnsIp = await this.getDnsServerAddress(address, domain);
                if(dnsIp.length <= 0){
                    client = null;
                    id = null;
                    domain = null;
                    typeName = null;
                    dnsIp = null;
                    return false;
                }
                this.getNetworkIP(client, id, domain, typeName, dnsIp);
            }
        }catch (err){
            console.log('NetworkHosts.networkRequest');
            logger.error(err);
            client = null;
            id = null;
            domain = null;
            typeName = null;
            err = null;
        }
        return true;
    }

    /**
     * 网络请求DNS
     * @param client
     * @param id
     * @param domain
     * @param typeName
     * @param dnsIp
     * @param dnsIpCur
     * @returns {boolean}
     */
    async getNetworkIP(client, id, domain, typeName, dnsIp, dnsIpCur = 0){
        try{
            if(dnsIp.length <= 0 || !dnsIp[dnsIpCur]){
                client = null;
                id = null;
                domain = null;
                typeName = null;
                dnsIp = null;
                dnsIpCur = null;
                return false;
            }
            let time = new Date().getTime();
            let obj = this;
            let timeoutName = utils.md5(domain+typeName);
            this.DnsServer.request(id, domain, typeName, dnsIp[dnsIpCur], function(err, answer){
                if(err){
                    logger.error(err);
                    if(dnsIpCur < dnsIp.length-1){
                        dnsIpCur++;
                        obj.getNetworkIP(client, id, domain, typeName, dnsIp, dnsIpCur);
                    }
                    err = null;
                    answer = null;
                    return false;
                }
                //console.log('['+process.pid+']', domain, typeName, (new Date().getTime()-time)+'ms', 'Server:', dnsIp[dnsIpCur]);
                try{
                    if(answer.answer.length <= 0 && answer.authority.length <= 0 && answer.additional.length <= 0 && dnsIpCur < dnsIp.length-1){
                        dnsIpCur++;
                        obj.getNetworkIP(client, id, domain, typeName, dnsIp, dnsIpCur);
                        err = null;
                        answer = null;
                        return false;
                    }
                    if(timeoutName in obj.timeoutDomainCount){
                        delete obj.timeoutDomainCount[timeoutName];
                    }
                    client.response.answer.rcode = answer.header.rcode;
                    client.response.answer.answer = utils.makeDnsData(answer.answer);
                    client.response.answer.authority = utils.makeDnsData(answer.authority);
                    client.response.answer.additional = utils.makeDnsData(answer.additional);
                    obj.setCache(domain, typeName, {
                        rcode: answer.header.rcode,
                        answer: answer.answer,
                        authority: answer.authority,
                        additional: answer.additional,
                    });  //缓存数据
                    client.socket.send('answer', JSON.stringify(client.response));
                }catch (error){
                    console.log('NetworkHosts.getNetworkIP.message');
                    logger.error(error);
                    error = null;
                }
                client = null;
                id = null;
                domain = null;
                typeName = null;
                dnsIp = null;
                dnsIpCur = null;
                err = null;
                answer = null;
            }, function(err){
                try{
                    console.log('NetworkHosts.getNetworkIP.error.stack');
                    logger.error(err);
                    if(dnsIpCur < dnsIp.length-1){
                        dnsIpCur++;
                        obj.getNetworkIP(client, id, domain, typeName, dnsIp, dnsIpCur);
                    }
                }catch (err){
                    console.log('NetworkHosts.getNetworkIP.error');
                    logger.error(err);
                }
                err = null;
            }, function(id){
                try{
                    if(timeoutName in obj.timeoutDomainCount && obj.timeoutDomainCount[timeoutName].count > 3){
                        delete obj.timeoutDomainCount[timeoutName];
                        obj.setCache(domain, typeName, {
                            answer: [],
                            authority: [],
                            additional: [],
                        }, 600);  //缓存失败的数据1小时
                        logger.error('timeout: '+domain+'-'+process.pid+', Count more than 3,   '+(new Date().getTime()-time)+'ms');
                        id = null;
                        return false;
                    }
                    if(timeoutName in obj.timeoutDomainCount){
                        obj.timeoutDomainCount[timeoutName].count = obj.timeoutDomainCount[timeoutName].count + 1;
                    }else{
                        obj.timeoutDomainCount[timeoutName] = {
                            time: new Date().getTime(),
                            count: 1
                        };
                    }
                    logger.error('['+process.pid+']timeout: '+domain+' '+typeName+'  '+(new Date().getTime()-time)+'ms  ' + 'Server: ' + dnsIp[dnsIpCur]);
                    if(dnsIpCur < dnsIp.length-1){
                        dnsIpCur++;
                        obj.getNetworkIP(client, id, domain, typeName, dnsIp, dnsIpCur);
                        id = null;
                        return false;
                    }
                }catch (err){
                    console.log('NetworkHosts.getNetworkIP.timeout');
                    logger.error(err);
                    err = null;
                }
                id = null;
            });
        }catch (err){
            console.log('NetworkHosts.getNetworkIP');
            logger.error(err);
            err = null;
        }
        return false;
    }

    /**
     * 获取缓存DNS解析记录
     * @param domain
     * @param typeName
     * @returns {boolean}
     */
    async getCache(domain, typeName){
        try{
            let response = await this.CacheRedis.get(this.domainToId(domain, typeName));
            if(!response){
                return false;
            }
            let ttl = await this.CacheRedis.ttl(this.domainToId(domain, typeName));
            let result = JSON.parse(response);
            if(ttl > 0){
                let ttlLimit = result.ttl - ttl;
                result.data.answer = this.parseCacheTTL(result.data.answer, ttlLimit, result.ttl);
                result.data.authority = this.parseCacheTTL(result.data.authority, ttlLimit, result.ttl);
                result.data.additional = this.parseCacheTTL(result.data.additional, ttlLimit, result.ttl);
            }
            return result.data;
        }catch (err){
            console.log('NetworkHosts.getCache');
            logger.error(err);
            err = null;
        }
        return false;
    }

    /**
     * 处理缓存的ttl时间
     * @param data
     * @param ttlLimit
     * @param defaultTTL
     * @returns {*}
     */
    parseCacheTTL(data, ttlLimit, defaultTTL = 60){
        try{
            for(let i=0;i<data.length;i++){
                let ttl = data[i].ttl - ttlLimit;
                if(ttl <= 10){
                    data[i].ttl = defaultTTL;
                }else{
                    data[i].ttl = ttl;
                }
            }
            return data;
        }catch(err){
            console.log('NetworkHosts.parseCacheTTL');
            logger.error(err);
            err = null;
        }
        return [];
    }

    /**
     * 设置缓存DNS解析记录
     * @param domain
     * @param typeName
     * @param data
     * @param defaultTtl
     * @returns {Promise<boolean>}
     */
    setCache(domain, typeName, data, defaultTtl=60){
        try{
            let result = this.DnsCacheParse.parse(data, typeName);
            if(result.err){
                console.log('NetworkHosts.setCache.result.error');
                logger.error(result.err);
                return false;
            }
            this.CacheRedis.set(this.domainToId(domain, typeName), JSON.stringify({ttl: result.ttl, data: result.data}), 'EX', result.ttl>0 ? result.ttl : defaultTtl);
        }catch (err){
            console.log('NetworkHosts.setCache');
            logger.error(err);
            err = null;
        }
        return true;
    }

    /**
     * 域名转可用ID
     * @param domain
     * @param typeName
     * @returns {string}
     */
    domainToId(domain, typeName){
        return this.cacheSuffix+typeName+':'+domain;
    }

    /**
     * 获取远程DNS服务器
     * @param address
     * @param domain
     * @returns {string[]}
     */
    async getDnsServerAddress(address, domain){
        try{
            //this.CacheRedis.set('cacheIP:'+address.address+':'+domain, JSON.stringify(address));
            return await this.NetworkIP.get(domain, address.address);
        }catch (err){
            console.log('NetworkHosts.getDnsServerAddress');
            logger.error(err);
            err = null;
        }
        return [];
    }
}

module.exports = NetworkHosts;
