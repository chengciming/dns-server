'use strict';
const config = require('../config');
const utils = require('../library/utils');
const logger = require('../library/logger');
const LocalHost = require('../logic/localHosts');
const NetworkHosts = require('../logic/networkHosts');
const nssocket = require('nssocket');

const localHost = new LocalHost();
const networkHosts = new NetworkHosts();

class Client{
    constructor(){
        try{
            this.connect();
            process.setMaxListeners(0);
        }catch (err){
            console.log('Client.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 连接master
     */
    connect(){
        try{
            this.client = new nssocket.NsSocket({
                reconnect: true,
                type: 'tcp4',
            });
        }catch (err){
            console.log('Client.connect');
            logger.error(err);
            err = null;
        }

    }

    /**
     * 监听请求
     * @param client
     * @param data
     * @returns {boolean}
     */
    async request (client, data) {
        try{
            if('question' in data && data.question && data.question.length > 0){
                let response = {key: null, answer: {rcode: null, answer: [], additional: [], authority: []}};
                response.key = data.key;
                for(let i=0;i<data.question.length;i++){
                    let entries = await localHost.request(data.question[i]);
                    if(entries !== false){
                        response.answer = entries;
                        client.send('answer', JSON.stringify(response));
                        response = null;
                        data = null;
                        return true;
                    }
                    networkHosts.request({socket: client, response: response}, ('id' in data ? data.id : 0), data.address, data.question[i]);
                }
            }
        }catch (err){
            console.log('Client.request');
            logger.error(err);
            err = null;
        }
        return false;
    }

    /**
     * 开始监听
     */
    run(){
        try{
            let obj = this;
            this.client.on('close', function(err){
                logger.error('Master Leave!');
                err = null;
            });
            this.client.on('start', function(err){
                logger.info('Connected Master!');
                err = null;
            });
            this.client.on('error', function(error){
                if('code' in error && error.code !== 'EHOSTUNREACH'){
                    logger.error('Can not connect Master.');
                }else if(!('code' in error) || ('code' in error && error.code !== 'ECONNREFUSED')){
                    logger.error(error);
                }else{
                    console.log('Client.run.error');
                }
                error = null;
            });
            this.client.data('question', async (data) => {
                try{
                    data = data.toString().trim();
                    if(data && data.length > 0){
                        data = JSON.parse(data);
                        obj.request(obj.client, data);
                    }else{
                        console.log('Client.run.question');
                        console.log(data);
                    }
                }catch (err){
                    console.log('Client.run.question');
                    logger.error(err);
                    err = null;
                }
                data = null;
                return true;
            });
            this.client.connect(config.master.port, config.master.address);
        }catch (err){
            console.log('Client.run');
            logger.error(err);
            err = null;
        }
    }
}

module.exports = Client;
