'use strict';
const logger = require('../library/logger');

class Broad{
    constructor(){

    }

    /**
     * 获取主域名
     * @param domain
     * @returns {string}
     */
    getMainDomain(domain){
        try{
            let domainArray = domain.split('.');
            return domainArray[domainArray.length-2]+'.'+domainArray[domainArray.length-1];
        }catch (err){
            console.log('Broad.getMainDomain');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 组建KEY路径
     * @param redisSuffix
     * @param mainDomain
     * @param fullDomain
     * @returns {string}
     */
    getFullKey(redisSuffix, mainDomain, fullDomain){
        return redisSuffix+mainDomain+':'+fullDomain;
    }

    /**
     * 获取某个域名对应生效的所有KEY
     * @param redisObj
     * @param redisSuffix
     * @param domain
     * @returns {Promise<*>}
     */
    async getKeys(redisObj, redisSuffix, domain){
        try{
            let mainDomain = this.getMainDomain(domain);
            let keys = await redisObj.keys(this.getFullKey(redisSuffix, mainDomain, '*'));
            if(!keys){
                return false;
            }
            return keys;
        }catch (err){
            console.log('Broad.getKeys');
            logger.error(err);
            err = null;
        }
        return false;
    }

    /**
     * 获取KEY最后生效的域名规则
     * @param key
     * @returns {*|string}
     */
    getLastKeyRule(key){
        try{
            let keyArray = key.split(':');
            return keyArray[keyArray.length-1];
        }catch (err){
            console.log('Broad.getLastKeyRule');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 组装泛解析域名: *.*.*.qq.com
     * @param domain
     * @param maxNum
     * @returns {*}
     */
    parseBroadDomain(domain, maxNum){
        try{
            let domainArray = domain.split('.');
            if(maxNum > domainArray.length - 2){
                return false;
            }
            for(let i=0;i<maxNum+1;i++){
                if(i >= domainArray.length-2){
                    break;
                }
                domainArray[i] = '*';
            }
            let newDomain = domainArray.join('.');
            if(domain === newDomain){
                return false;  //无变化则返回false
            }
            return newDomain;
        }catch (err){
            console.log('Broad.parseBroadDomain');
            logger.error(err);
            err = null;
        }
        return false;
    }

    /**
     * 获取域名对应命中的HOST key
     * @param redisObj
     * @param redisSuffix
     * @param domain
     * @returns {Promise<*>}
     */
    async checkKey(redisObj, redisSuffix, domain){
        try{
            let keys = await this.getKeys(redisObj, redisSuffix, domain);
            if(!keys || keys.length <= 0){
                return false;
            }
            let mainDomain = this.getMainDomain(domain);
            let domainArray = domain.split('.');
            let fullKey = this.getFullKey(redisSuffix, mainDomain, domain);
            //检查完整域名域名匹配是否存在
            if(keys.indexOf(fullKey) >= 0){
                return fullKey;
            }
            //检查泛解析：带*号的域名，此检查固定多少段域名
            for(let i = 0;i<domainArray.length-2;i++){
                let broadDomain = this.parseBroadDomain(domain, i);
                if(broadDomain === false){
                    break;
                }
                fullKey = this.getFullKey(redisSuffix, mainDomain, broadDomain);
                if(keys.indexOf(fullKey) >= 0){
                    return fullKey;
                }
            }
            //检查双泛解析：带**号的域名，此检查不固定多少段域名
            let i = 0, length = domainArray.length;
            while(i < length-2){
                domainArray[0] = '**';
                fullKey = this.getFullKey(redisSuffix, mainDomain, domainArray.join('.'));
                if(keys.indexOf(fullKey) >= 0){
                    return fullKey;
                }
                domainArray.shift();
                i++;
            }
        }catch (err){
            console.log('Broad.checkKey');
            logger.error(err);
            err = null;
        }
        return false;
    }
}

module.exports = Broad;
