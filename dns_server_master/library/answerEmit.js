'use strict';
const logger = require('./logger');

class AnswerEmit{
    constructor(timeout = 5000){
        this._answerEventList = {};
        this._answerTimeout = timeout;
        let obj = this;
        setInterval(function(){obj.timeout();}, 2000);
    }

    /**
     * 超时处理事件
     */
    timeout(){
        try{
            let time = new Date().getTime();
            for(let id in this._answerEventList){
                for(let i=0;i<this._answerEventList[id].length;i++){
                    if(this._answerEventList[id][i] && ('time' in this._answerEventList[id][i]) && time - this._answerEventList[id][i].time >= this._answerTimeout){
                        'timeoutCallback' in this._answerEventList[id][i] &&
                        this._answerEventList[id][i].timeoutCallback &&
                        this._answerEventList[id][i].timeoutCallback(id);
                        delete this._answerEventList[id][i];
                    }
                }
            }
        }catch (err){
            console.log('AnswerEmit.timeout');
            logger.error(err);
        }
    }

    /**
     * 注册事件
     * @param id
     * @param callback
     * @param timeoutCallback
     * @returns {*}
     */
    on(id, callback, timeoutCallback) {
        timeoutCallback = timeoutCallback ? timeoutCallback : null;
        try{
            let data = {
                time: new Date().getTime(),
                callback: callback,
                timeoutCallback: timeoutCallback,
            };
            if(!(id in this._answerEventList)){
                this._answerEventList[id] = [data];
            }else{
                this._answerEventList[id].push(data);
            }
            return true;
        }catch (err) {
            console.log('AnswerEmit.on');
            logger.error(err);
        }
        return false;
    };

    /**
     * 触发事件
     * @param id
     * @param arg
     * @returns {boolean}
     */
    emit(id, ...arg) {
        try{
            if(id in this._answerEventList){
                for(let i=0;i<this._answerEventList[id].length;i++){
                    this._answerEventList[id][i] &&
                    'callback' in this._answerEventList[id][i] &&
                    this._answerEventList[id][i].callback(this.parentObj, ...arg);
                }
                delete this._answerEventList[id];
                return true;
            }
            return false;
        }catch (err) {
            console.log('AnswerEmit.emit');
            logger.error(err);
        }
        return false;
    };
}

module.exports = AnswerEmit;
