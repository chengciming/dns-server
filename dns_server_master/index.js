'use strict';
const cluster = require('cluster');
const config = require('./config');
const logger = require('./library/logger');
const Server = require('./library/server');
const nssocket = require('nssocket');

class Master{
    constructor(){
        try{
            this.workerSocketCount = [];
            this.worker = [];
            let obj = this;
            //创建子进程
            this.createWorker();  //先创建一个进程，不够再创建
            setTimeout(function(){
                try{
                    //创建TCP 节点监听
                    obj.nodeServer = nssocket.createServer(function(socket) {
                        logger.info('Master: Client connected.');
                        obj.createNodeSocket(socket);
                    });
                    obj.nodeServer.listen(config.nodeServer.port, config.nodeServer.address, () => {
                        logger.info('Master: Listening tcp on '+config.nodeServer.address+':'+config.nodeServer.port)
                    });
                }catch (err){
                    console.log('Master.constructor.timeout.error');
                    logger.error(err);
                    err = null
                }
            }, 2000);
        }catch (err) {
            console.log('Master.constructor');
            logger.error(err);
            err = null
        }
    }

    /**
     * 创建新子进程
     * @param index
     * @param callback
     * @returns {*}
     */
    createWorker(index=null, callback=null){
        try{
            if(index === null){
                index = this.worker.length;
            }
            let worker = cluster.fork();
            this.worker[index] = {
                pid: worker.process.pid,
                worker: worker
            };
            this.workerSocketCount[index] = 0;
            let obj = this;
            worker.on('message', function(msg, socket=null){
                try{
                    if(msg.method === 'closeSocket'){
                        obj.closeNodeSocket(msg.pid);
                    }
                }catch (err) {
                    console.log('Master.createWorker.onMessage');
                    logger.error(err);
                    err = null;
                }
            });
            // 创建进程完成后输出提示信息
            worker.on('online', () => {
                try{
                    logger.info('Create Worker: ' + worker.process.pid);
                    if(callback !== null){
                        callback();
                    }
                }catch (err){
                    console.log('Master.createWorker.online');
                    logger.error(err);
                    err = null;
                }
            });
            // 子进程退出后重启
            worker.on('exit', (code, signal) => {
                try{
                    let index = obj.getProcessIndex(worker.process.pid);
                    if(obj.worker[index] !== null){
                        obj.worker.splice(index, 1);
                    }
                    if(obj.workerSocketCount[index] !== null){
                        obj.workerSocketCount.splice(index, 1);
                    }
                    if(code !== 0){
                        logger.error('Master: worker ' + worker.process.pid + ' exit with code: ' + code + ', and signal: ' + signal);
                    }
                    code = null;
                    signal = null;
                }catch (err){
                    console.log('Master.createWorker.exit');
                    logger.error(err);
                    err = null;
                }
            });
            worker.on('error', (error) => {
                console.log('Worker Process Error!');
                logger.error(error);
                error = null;
            });
            return worker;
        }catch (err){
            console.log('Master.createWorker');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 分配socket到子进程
     * @param socket
     */
    createNodeSocket(socket){
        try{
            let minCount = Math.min.apply(null, this.workerSocketCount);  //取出哪个进程分配了最少的socket
            if(this.workerSocketCount.length <= 0 || (minCount > 0 && this.workerSocketCount.length < config.node.processMaxNumber)){
                let obj = this;
                this.createWorker(null, function(){
                    minCount = Math.min.apply(null, obj.workerSocketCount);  //取出哪个进程分配了最少的socket
                    let index = obj.workerSocketCount.indexOf(minCount);
                    obj.workerSocketCount[index]++;
                    obj.worker[index].worker.send({method: 'cretaeSocket', pid: 0}, socket.socket);  //告诉这个进程加多一个socket
                });
            }else{
                let index = this.workerSocketCount.indexOf(minCount);
                this.workerSocketCount[index]++;
                this.worker[index].worker.send({method: 'cretaeSocket', pid: 0}, socket.socket);  //告诉这个进程加多一个socket
            }
        }catch (err){
            console.log('Master.getProcessIndex');
            logger.error(err);
            err = null;
        }
    }

    /**
     * 获取对应进程PID储存的序号
     * @param pid
     * @returns {*}
     */
    getProcessIndex(pid){
        try{
            for(let index in this.worker){
                if(this.worker[index].worker.process.pid === pid){
                    return index;
                }
            }
        }catch (err){
            console.log('Master.getProcessIndex');
            logger.error(err);
            err = null;
        }
        return -1;
    }

    /**
     * TCP链接断开
     * @param pid
     * @returns {boolean}
     */
    closeNodeSocket(pid){
        try{
            let index = this.getProcessIndex(pid);
            if(index in this.workerSocketCount){
                this.workerSocketCount[index]--;
            }
            if(this.workerSocketCount[index] <= 0){  //没有socket了
                this.worker[index].worker.send({method: 'exit'});
            }
        }catch (err){
            console.log('Master.closeNodeSocket');
            logger.error(err);
            err = null;
        }
        return true;
    }
}
try{
    if (cluster.isMaster) {
        new Master();
    }else{
        const server = new Server();
        server.run();
    }
}catch (err){
    console.log('index');
    logger.error(err);
    err = null;
}
// const http = require('http');
// http.createServer((req, res) => {
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'application/json');
//   let status = {
//     name: 'items_crawler',
//     desc: '淘宝商品采集',
//     APP_ENV: process.env.APP_ENV || 'dev',
//     pid: process.pid,
//     mem: process.memoryUsage(),
//     data: {
//       shz: shzObj.status,
//       dtk: dtkObj.status,
//       qtk: qtkObj.status,
//       lltk: lltkObj.status,
//       //material: materialObj.status,
//       coupon: couponObj.status,
//       tgwid: tgwidObj.status
//     }
//   };
//   res.end(JSON.stringify(status));
// }).listen(80, '0.0.0.0');
