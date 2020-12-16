'use strict';
const logger = require('./logger');
const AnswerEmit = require('./answerEmit');
const crypto = require('crypto');
const nssocket = require('nssocket');
const CollectServer = require('./collectServer');

class Node{
    constructor(){
        try{
            this.CollectServer = new CollectServer();
            this.emitter = new AnswerEmit(10000);
            this.emitter.parentObj = this;
            process.setMaxListeners(0);
            this.socketCurKey = 0;
            this.socket = [];
        }catch (err){
            console.log('Node.constructor');
            logger.error(err);
            err = null;
        }
    }

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
            console.log('Node.md5');
            logger.error(err);
            err = null;
        }
        return null;
    };

    /**
     * 组装DNS数据包
     * @param id
     * @param question
     * @param address
     * @returns obj
     */
    dnsData(id, question, address){
        return {id: id, address: address, question: question};
    }

    /**
     * 过滤不可解析的DNS
     * @param request
     * @param response
     * @returns {boolean}
     */
    denyDnsRequest(request, response){
        try{
            if(request.question.length > 1){
                console.log('More question: ', request.question)
            }
            let result = true;
            let reg = /^[a-z|A-Z|0-9|\-|\_|\.|\s]+$/;
            for(let i=0;i<request.question.length;i++){
                if(!request.question[i].name || request.question[i].name.trim().length <= 0){
                    //logger.error('Domain Error: '+JSON.stringify(request.question[i]));
                    result = false;
                    break;
                }else if(reg.test(request.question[i].name.trim()) === false){
                    //logger.error('Domain Match Error: '+JSON.stringify(request.question[i]));
                    result = false;
                    break;
                }
            }
            if(result === false){
                response.answer = [];
                response.authority = [];
                response.additional = [];
                response.send();
                request = null;
                return false;
            };
        }catch (err){
            console.log('Node.denyDnsRequest');
            logger.error(err);
            err = null;
        }
        request = null;
        return true;
    }

    /**
     * 获取当前可用的socket
     * @param response
     * @returns {*}
     */
    getSocket(response){
        try{
            if(this.socket.length <= 0){
                logger.error('No Node Link!');
                response.answer = [];
                response.authority = [];
                response.additional = [];
                response.send();
                return false;
            }
            if(this.socketCurKey >= this.socket.length-1){
                this.socketCurKey = 0;
            }else{
                this.socketCurKey++;
            }
            return this.socket[this.socketCurKey];
        }catch (err){
            console.log('Node.getSocket');
            logger.error(err);
            err = null;
        }
        return null;
    }

    /**
     * 监听DNS请求
     * @param request
     * @param response
     * @returns {boolean}
     */
    async dnsRequest (request, response) {
        try{
            let result = this.denyDnsRequest(request, response);
            if(result === false){
                return false;
            }
            //发送域名给检查
            this.CollectServer.send(response.header.id, request.question, request.address);
            //获取节点socket，并且发送解析请求给节点
            let socket = this.getSocket(response);
            if(socket){
                //console.log('['+process.pid+']', request.question[0].name, request.question[0].type)
                let data = this.dnsData(response.header.id, request.question, request.address);
                data.key = this.md5(JSON.stringify(data));
                socket.send('question', JSON.stringify(data));
                this.emitter.on(data.key, function(parentObj, answer){
                    try{
                        parentObj.onAnswer(answer, response);
                    }catch (err){
                        console.log('Node.dnsRequest.emitterOn');
                        logger.error(err);
                        err = null;
                    }
                }, function(id){
                    try{
                        logger.error('Timeout: '+JSON.stringify(data.question))
                    }catch (err){
                        console.log('Node.dnsRequest.Timeout');
                        logger.error(err);
                        err = null;
                    }
                    id = null;
                });
            }
        }catch (err){
            console.log('Node.dnsRequest');
            logger.error(err);
            err = null;
        }
    }

    /**
     * DNS解析结果回应
     * @param answerData
     * @param response
     */
    onAnswer(answerData, response) {
        try {
            if (!answerData.answer) {
                response.send();
                answerData = null;
                return false;
            }
            if (answerData.answer.rcode !== null) {
                response.header.rcode = answerData.answer.rcode;
            }
            response.answer = this.parseAnswer(answerData.answer.answer);
            response.authority = this.parseAnswer(answerData.answer.authority);
            response.additional = this.parseAnswer(answerData.answer.additional);
            response.send();
        } catch (err) {
            console.log('Node.onAnswer');
            logger.error(err);
            err = null;
        }
        answerData = null;
        return true;
    }

    /**
     * 处理数据
     * @param opt
     * @returns {*}
     */
    parseAnswer(opt){
        try{
            for(let i=0;i<opt.length;i++){
                if(opt[i].type !== 16 && opt[i].type !== 99 && 'data' in opt[i] && typeof opt[i].data === 'object'){  //16: TXT
                    opt[i].data = Buffer.from(opt[i].data);
                }
            }
            return opt;
        }catch (err){
            console.log('Node.parseAnswer');
            logger.error(err);
            err = null;
        }
        return opt;
    }

    /**
     * 节点端回应数据
     * @param data
     */
    onData(data){
        try{
            data = data.toString().trim();
            data = JSON.parse(data);
            if(data){
                if('key' in data && data.key.length > 0){
                    this.emitter.emit(data.key, data);
                }
            }
        }catch (err){
            console.log('Node.onData');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 保存已连接上来的socket
     * @param socket
     */
    setSocket(socket){
        try{
            let obj = this;
            logger.info('Node['+process.pid+'] Client connected.');
            socket = nssocket.NsSocket(socket, {});
            this.socket.push(socket);  //增加节点
            socket.on('close', function(){
                try{
                    logger.info('['+process.pid+'] Client disconnected.');
                    let keyIndex = obj.socket.indexOf(socket);
                    if(keyIndex >= 0){
                        process.send({method: 'closeSocket', pid: process.pid});
                        obj.socket.splice(keyIndex, 1);
                    }
                }catch (err){
                    console.log('Node.run.createServer.close');
                    logger.error(err);
                    err = null;
                }
            });
            socket.data('answer', function(data) {
                try{
                    obj.onData(data);
                }catch (err){
                    console.log('Node.run.createServer.answer');
                    logger.error(err);
                    err = null;
                }
            });
            socket.on('error', function(err){
                try{
                    if(err.code === 'ECONNRESET'){
                        logger.info('Client Down.');
                    }else{
                        console.log('Node.run.createServer.error.');
                        logger.error(err);
                    }
                }catch (error){
                    console.log('Node.run.createServer.error');
                    logger.error(error);
                    error = null;
                }
                err = null;
            });
        }catch (err){
            console.log('Node.run.createServer');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 错误报错
     * @param err
     */
    serverError (err) {
        try{
            if (err.code === 'EADDRINUSE') {
                console.log('Address in use, retrying...');
            }
            console.log('Node.serverError.');
            logger.error(err);
        }catch (erroe){
            console.log('Node.serverError');
            logger.error(error);
            error = null;
        }
        err = null;
    }
}

module.exports = Node;
