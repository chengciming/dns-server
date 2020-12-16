'use strict';
const utils = require('../library/utils');
const CustomRedis = require('../library/customRedis');
const dns = require('native-dns');
const logger = require('../library/logger');
const broad = require('./broad');

class LocalHost{
    constructor(){
        try{
            this.localRedisSuffix = 'LocalHosts:';
            this.broadObj = new broad();
            this.CustomRedis = CustomRedis;
        }catch (err){
            console.log('LocalHost.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 处理本地解析
     * @param question
     * @returns {boolean}
     */
    async request(question) {
        try{
            let domain = question.name;
            let typeName = utils.getName(question.type);
            if(typeName === false){
                return false;
            }
            let redisKey = await this.broadObj.checkKey(this.CustomRedis, this.localRedisSuffix+typeName.toUpperCase()+':', domain);
            if(!redisKey){
                return false;
            }
            let entries = await this.CustomRedis.get(redisKey);
            if(!entries){
                return false;
            }
            entries = JSON.parse(entries);
            let response = {rcode: null, answer: [], authority: [], additional: []};
            if('rcode' in entries){
                response.rcode = entries.rcode;
            }
            if('answer' in entries){
                for(let i=0;i<entries.answer.length;i++){
                    response.answer.push(this.parseData(domain, question.type, entries.answer[i]));
                }
            }
            if('authority' in entries){
                for(let i=0;i<entries.authority.length;i++){
                    response.authority.push(this.parseData(domain, question.type, entries.authority[i]));
                }
            }
            if('additional' in entries){
                for(let i=0;i<entries.additional.length;i++){
                    response.additional.push(this.parseData(domain, question.type, entries.additional[i]));
                }
            }
            response.answer = utils.makeDnsData(response.answer);
            response.authority = utils.makeDnsData(response.authority);
            response.additional = utils.makeDnsData(response.additional);
            return response;
        }catch (err){
            console.log('LocalHost.request');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 处理单个解析包
     * @param domain
     * @param type
     * @param entries
     * @returns {*}
     */
    parseData(domain, type, entries){
        if(!('name' in entries)){
            entries.name = domain;
        }
        if(!('type' in entries)){
            entries.type = type;
        }
        return entries;
    }
}

module.exports = LocalHost;
