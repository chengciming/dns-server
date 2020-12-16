'use strict';
const logger = require('./logger');
const config = require('../config');
const nssocket = require('nssocket');

class CollectServer{
    constructor(){
        try{
            this.connectStatus = false;
            this.connect();
        }catch (err){
            console.log('CollectServer.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 连接master
     */
    connect(){
        try{
            if(!('collectServer' in config)){
                logger.error('No CollectServer Config.');
                return false;
            }
            this.client = new nssocket.NsSocket({
                reconnect: true,
                type: 'tcp4',
            });
            let obj = this;
            this.client.on('close', function(err){
                obj.connectStatus = false;
                logger.error('CollectServer Leave!');
            });
            this.client.on('start', function(err){
                obj.connectStatus = true;
                logger.info('Connected CollectServer!');
            });
            this.client.on('error', function(error){
                if('code' in error && error.code !== 'EHOSTUNREACH'){
                    obj.connectStatus = false;
                    logger.error('Can not connect CollectServer.');
                }else if(!('code' in error) || ('code' in error && error.code !== 'ECONNREFUSED')){
                    logger.error(error);
                }else{
                    console.log('CollectServer.run.error');
                }
            });
            this.client.connect(config.collectServer.port, config.collectServer.address);

        }catch (err){
            console.log('CollectServer.connect');
            logger.error(err);
            err = null;
        }

    }

    /**
     * 发送收集域名
     * @param id
     * @param question
     * @param address
     * @returns {boolean}
     */
    send(id, question, address){
        if(this.connectStatus === false){
            return false;
        }
        this.client.send('collectDomain', JSON.stringify({id: id, question: question, address: address}));
        return true;
    }
}

module.exports = CollectServer;
