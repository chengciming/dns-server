'use strict';
const dns = require('native-dns');
const logger = require('../library/logger');
const Node = require('../library/node');

class Server{
    constructor(){
        try{
            process.setMaxListeners(0);
            this.node = new Node();
            this.Dns = dns.createServer();
            let obj = this;
            process.on('message', function(msg, socket=null){
                try{
                    if(msg.method === 'cretaeSocket'){
                        obj.node.setSocket(socket);
                    }else if(msg.method === 'exit'){
                        logger.info('['+process.pid+'] Process Exit.');
                        process.exit(0);
                    }
                }catch (err){
                    console.log('Server.constructor.message');
                    logger.error(err);
                    err = null;
                }
            });
        }catch (err){
            console.log('Server.constructor');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 开始监听
     */
    run(){
        try{
            //监听DNS
            this.Dns.parentObj = this;
            this.Dns.on('request', function(request, response) {
                //response._socket.base_size = 1024;
                try{
                    this.parentObj.node.dnsRequest(request, response);
                }catch (err){
                    console.log('Server.run');
                    logger.error(err);
                    err = null;
                }
            });
            this.Dns.on('error', this.error);
            logger.info('['+process.pid+'] Listening udp on 53');
            this.Dns.serve(53);
        }catch (err){
            console.log('Server.run');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 错误报错
     * @param err
     * @param buff
     * @param req
     * @param res
     */
    error (err, buff, req, res) {
        try{
            console.log('Server.error');
            logger.error(err);
        }catch (error){
            console.log('Server.error');
            logger.error(error);
            error = null;
        }
    }
}

module.exports = Server;
