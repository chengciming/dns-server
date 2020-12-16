'use strict';
const logger = require('./logger');

class DnsCacheParse{
    constructor(){

    }

    /**
     * 处理A解析数据
     * @param dnsData
     * @returns {{err: null, ttl: number, data: Array}}
     */
    parseA(dnsData){
        let ttl = 0;
        let data = [];
        let ADomain = false;
        for(let i=0;i< dnsData.length;i++){
            if(dnsData[i].type === 5){  //CNAME
                if(ADomain === false){
                    ADomain = dnsData[i].name;
                }
            }else{
                if(ADomain !== false){
                    dnsData[i].name = ADomain;
                }
                data.push(dnsData[i]);
                if(ttl === 0 || dnsData[i].ttl < ttl){
                    ttl = dnsData[i].ttl;
                }
            }
        }
        return {err: null, ttl: ttl, data: data};
    }

    /**
     * 处理AAAA数据
     * @param dnsData
     * @returns {{err: null, ttl: number, data: Array}}
     */
    parseAAAA(dnsData){
        let ttl = 0;
        let data = [];
        let ADomain = false;
        for(let i=0;i< dnsData.length;i++){
            if(dnsData.length > 1 && i < dnsData.length-1 && dnsData[i].type === 5){  //CNAME
                if(ADomain === false){
                    ADomain = dnsData[i].name;
                }
            }else{
                if(ADomain !== false){
                    dnsData[i].name = ADomain;
                }
                data.push(dnsData[i]);
                if(ttl === 0 || dnsData[i].ttl < ttl){
                    ttl = dnsData[i].ttl;
                }
            }
        }
        return {err: null, ttl: ttl, data: data};
    }

    /**
     * 解析并且处理DNS数据
     * @param dnsData
     * @param typeName
     * @returns {*}
     */
    parse(dnsData, typeName){
        try{
            let ttl = 0;
            // if(typeName === 'A'){
            //     let result = this.parseA(dnsData.answer);
            //     if(result.err){
            //         logger.error(result.err);
            //         return {err: err, ttl: 0, data: null};
            //     }
            //     dnsData.answer = result.data;
            //     if(ttl === 0 || ttl > result.ttl){
            //         ttl = result.ttl;
            //     }
            // }
            // else if(typeName === 'AAAA'){
            //     let result = this.parseAAAA(dnsData.answer);
            //     if(result.err){
            //         logger.error(result.err);
            //         return {err: err, ttl: 0, data: null};
            //     }
            //     dnsData.answer = result.data;
            //     if(ttl === 0 || ttl > result.ttl){
            //         ttl = result.ttl;
            //     }
            // }else{
                for(let i=0;i< dnsData.answer.length;i++){
                    if(dnsData.answer[i].ttl > ttl){
                        ttl = dnsData.answer[i].ttl;
                    }
                }
            //}
            for(let i=0;i< dnsData.authority.length;i++){
                if(dnsData.authority[i].ttl > ttl){
                    ttl = dnsData.authority[i].ttl;
                }
            }
            for(let i=0;i< dnsData.additional.length;i++){
                if(dnsData.additional[i].ttl > ttl){
                    ttl = dnsData.additional[i].ttl;
                }
            }
            return {err: null, ttl: ttl, data: dnsData};
        }catch(err){
            console.log('DnsCacheParse.parse');
            return {err: err, ttl: 0, data: null};
        }
    }
}

module.exports = DnsCacheParse;
