'use strict';
const config = require('../config');
const dns = require('native-dns');
const logger = require('../library/logger');
const AnswerEmit = require('../library/answerEmit');
const utils = require('../library/utils');
const dnsPacket = require('native-dns-packet');
const dgram = require('dgram');

class DnsServer{
    constructor(){
        try{
            this.timeout = 5000;
            this.emitter = new AnswerEmit(this.timeout);
            this.emitter.parentObj = this;
            this.dnsServerSocketCur = {};
            //this.dnsServerSocketActive = {};
            this.dnsServerSocket = {};
        }catch (err){
            console.log('DnsServer.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 创建对应DNS服务器地址的socket
     * @param dnsServerIp
     */
    createSocket(dnsServerIp){
        let parentObj = this;
        this.dnsServerSocket[dnsServerIp] = [];
        //this.dnsServerSocketActive[dnsServerIp] = [];
        this.dnsServerSocketCur[dnsServerIp] = -1;
        for(let i=0;i<config.udp.proccessSocketNum;i++){
            let req = dgram.createSocket('udp4');
            if(req){
                req.setMaxListeners(0);
                this.dnsServerSocket[dnsServerIp].push(req);
                //this.dnsServerSocketActive[dnsServerIp].push(0);
                req.on('message', function(message){
                    try{
                        let answer = dnsPacket.parse(message);
                        parentObj.emitter.emit(utils.md5(answer.question[0].name+utils.getName(answer.question[0].type)), answer);
                    }catch (err){
                        console.log('DnsServer.constructor.udp4.error');
                        logger.error(err);
                        err = null;
                    }
                });
                req.on('error', function(error){
                    console.log('DnsServer.constructor.udp4.error');
                    error = null;
                });
            }
        }
        return true;
    }

    /**
     * 获取socket
     * @param dnsServerIp
     * @returns {*}
     */
    getSocket(dnsServerIp){
        try{
            if(!(dnsServerIp in this.dnsServerSocket)){
                this.createSocket(dnsServerIp);
            }
            if(this.dnsServerSocket[dnsServerIp].length <= 0){
                logger.error('No Node Link!');
                return false;
            }
            if(this.dnsServerSocketCur[dnsServerIp] >= this.dnsServerSocket[dnsServerIp].length-1){
                this.dnsServerSocketCur[dnsServerIp] = 0;
            }else{
                this.dnsServerSocketCur[dnsServerIp] += 1;
            }
            // let minNum = Math.min.apply(null, this.dnsServerSocketActive[dnsServerIp]);  //取出最小的
            // let index = this.dnsServerSocketActive[dnsServerIp].indexOf(minNum);
            // if(index >= 0){
            //     this.dnsServerSocketCur[dnsServerIp] = index;
            // }else{
            //     if(this.dnsServerSocketCur[dnsServerIp] >= this.dnsServerSocket[dnsServerIp].length-1){
            //         this.dnsServerSocketCur[dnsServerIp] = 0;
            //     }else{
            //         this.dnsServerSocketCur[dnsServerIp]++;
            //     }
            // }
            if(this.dnsServerSocket[dnsServerIp][this.dnsServerSocketCur[dnsServerIp]]){
                //this.dnsServerSocketActive[dnsServerIp][this.dnsServerSocketCur[dnsServerIp]] = new Date().getTime();
                return {socket: this.dnsServerSocket[dnsServerIp][this.dnsServerSocketCur[dnsServerIp]], index: this.dnsServerSocketCur[dnsServerIp]};
            }
        }catch (err){
            console.log('DnsServer.getSocket');
            logger.error(err);
            err = null;
        }
        return null;
    }


    /**
     * 创建DNS Buffer
     * @param id
     * @param question
     * @param serverIpaddress
     * @param timeout
     * @returns {*}
     */
    createBuffer(id, question, serverIpaddress, timeout = 1000){
        try{
            let req = new dnsPacket();
            req.header.id = id;
            req.question = [question];
            req.server = { address: serverIpaddress, port: 53, type: 'udp' };
            req.timeout = timeout;
            let buf = Buffer.alloc(config.udp.bufferSize);
            dnsPacket.write(buf, req);
            return buf;
        }catch (err){
            console.log('DnsServer.createBuffer');
            logger.error(err);
            err = null;
        }
        return null;
    }

    /**
     * 网络请求DNS
     * @param id
     * @param domain
     * @param typeName
     * @param dnsIp
     * @param messageCallback
     * @param errorCallback
     * @param timeoutCcallback
     * @returns {Promise<boolean>}
     */
    async request(id, domain, typeName, dnsIp, messageCallback = null, errorCallback = null, timeoutCcallback = null){
        let timeout = this.timeout;
        messageCallback = messageCallback ? messageCallback : function(error, answer){};
        errorCallback = errorCallback ? errorCallback : function(error){};
        timeoutCcallback = timeoutCcallback ? timeoutCcallback : function(id=null){};
        try{
            if(dnsIp.length <= 0){
                messageCallback = null;
                errorCallback = null;
                timeoutCcallback = null;
                return false;
            }
            let buffer = this.createBuffer(id, dns.Question({name: domain,type: typeName}), dnsIp, timeout);
            let socketObj = this.getSocket(dnsIp);
            //let obj = this;
            this.emitter.on(utils.md5(domain+typeName), function(parentObj, answer){
                try{
                    //obj.dnsServerSocketActive[socketObj.index] = 0;
                    messageCallback(null, answer);
                    answer = null;
                }catch (err){
                    console.log('DnsServer.request.emitter.message.error');
                    messageCallback(err, null);
                    logger.error(err);
                    answer = null;
                    err = null;
                }
            }, function(id){
                //obj.dnsServerSocketActive[socketObj.index] = 0;
                timeoutCcallback(domain, typeName, dnsIp);
                id = null;
            });
            socketObj.socket.send(buffer, 53, dnsIp);
        }catch (err){
            console.log('DnsServer.request');
            errorCallback(err);
            messageCallback = null;
            errorCallback = null;
            timeoutCcallback = null;
            err = null;
        }
        return false;
    }
}

module.exports = DnsServer;
