'use strict';
const elasticsearch = require('elasticsearch');
const config = require('../config');
const logger = require('./logger');
const esClient = new elasticsearch.Client(config.elasticsearch);

class EsDb{
    constructor(){
        this.db = esClient;
    }

    /**
     * 查询数据
     * @param database 数据库
     * @param table 表名称
     * @param id 查询ID
     * @returns {boolean}
     */
    async selectId(database, table, id){
        try{
            let response = await this.db.get({
                index: database,
                type: table,
                id: id
            });
            return {err: null, response: response};
        }catch(err){
            return {err: err, response: null};
        }
    }

    /**
     * 查询数据
     * @param database 数据库
     * @param table 表名称
     * @param query 查询条件
     * @returns {boolean}
     */
    async select(database, table, query){
        try{
            let response = await this.db.search({
                index: database,
                type: table,
                body: query
            });
            return {err: null, response: response};
        }catch(err){
            return {err: err, response: null};
        }
    }

    /**
     * 保存数据，ID存在则更新，不存在则插入
     * @param database 库名称
     * @param table 表名称
     * @param id ID主键
     * @param data 数据，一维数据
     * @returns {boolean}
     */
    async save(database, table, id, data){
        try{
            console.log('=============');
            let response = await this.db.index({
                index: database, //相当于database
                type: table,  //相当于table
                id: id,// 数据到唯一标示，id存在则为更新，不存在为插入
                timeout: '30s',
                body: data//文档到内容
            });
            console.log('***************');
            return {err: null, response: response};
        }catch(err){
            console.log('&&&&&', err);
            return {err: err, response: null};
        }
    }

    /**
     * 删除数据
     * @param database 数据库
     * @param table 表名称
     * @param id ID主键
     */
    async delete(database, table, id){
        try{
            let response = await this.db.delete({
                index: database,
                type: table,
                id: id
            });
            return {err: null, response: response};
        }catch(err){
            return {err: err, response: null};
        }
    }
}

module.exports = EsDb;
