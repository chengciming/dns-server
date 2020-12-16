'use strict';
const dns = require('native-dns');

module.exports = {
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
