'use strict';
const dns = require('native-dns');
const crypto = require('crypto');

module.exports = {
    /**
     * 转换回复数据
     * @param opts
     * @returns {{}}|null
     */
    makeDnsData(opts){
        try{
            for(let i=0;i<opts.length;i++){
                opts[i].class = dns.consts.NAME_TO_QCLASS.IN;
                if(opts[i].type === 6 && 'serial' in opts[i] && (opts[i].serial & 0xFFFFFFFF) < 0){
                    opts[i].serial = -opts[i].serial;
                }
            }
            return opts;
        }catch (err){
            console.log('utils.makeDnsData');
            logger.error(err);
        }
        return null;
    },

    /**
     * MD5加密
     * @param text
     * @returns {PromiseLike<ArrayBuffer>}
     */
    md5 (text) {
        try{
            if(!text){
                return null;
            }
            return crypto.createHash('md5').update(text).digest('hex');
        }catch (err) {
            logger.error(err);
        }
        return null;
    },

    /**
     * 获取DNS类型字符串名
     * @param type
     * @returns {*}
     */
    getName: function(type){
        return dns.consts.qtypeToName(type);
    },
    /**
     * 获取DNS类型
     * @param name
     * @returns {*}
     */
    getType: function(name){
        return dns.consts.nameToQtype(name);
    },
};
