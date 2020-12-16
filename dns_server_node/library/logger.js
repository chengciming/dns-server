const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
const Transport = require('winston-transport');
const config = require('../config/index');
const fs = require("fs");

/**
 * 构造日期格式化方法
 * @param fmt
 * @returns {*}
 * @constructor
 */
Date.prototype.Format = function (fmt) { //author: meizz
    let o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (let k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};


const appFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

const ignorePrivate = format((info, opts) => {
    if ('private' in info && info.private) { return false; }
    return info;
});

config.loggerConfig.errorFileName = (config.loggerConfig.errorFileName).replace('{DATE}', new Date().Format('yyyy-MM-dd'));
config.loggerConfig.combinedFileName = (config.loggerConfig.combinedFileName).replace('{DATE}', new Date().Format('yyyy-MM-dd'));
//如果日记目录不存在则创建
fs.exists(config.loggerConfig.logdir||'logs', function (exists) {
    if (!exists) {
        fs.mkdir(config.loggerConfig.logdir||'logs', function(){});
    }
});

class SentryTransport extends Transport {
    constructor(opts) {
        super(opts);
        //
        // Consume any custom options here. e.g.:
        // - Connection information for databases
        // - Authentication information for APIs (e.g. loggly, papertrail,
        //   logentries, etc.).
        //
    }

    log(info, callback) {
        if(info.level === 'error') {
            let extra = {
                'level': info.level,
                'extra': {},
                'tags': {environments: config.env}
            };
            setImmediate(() => {
                this.emit('logged', info);
                Raven.captureException(info, extra);
            });
        }
        // Perform the writing to the remote service
        callback();
    }
};

const logger = createLogger({
    level: 'info',
    format: format.combine(
        ignorePrivate(),
        timestamp(),
        format.json()
    ),
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log`
        // - Write all logs error (and below) to `error.log`.
        //
        new transports.File({filename: (config.loggerConfig.logdir||'log') + '/' + config.loggerConfig.errorFileName, level: 'error'}),
        new transports.File({filename: (config.loggerConfig.logdir||'log') + '/' + config.loggerConfig.combinedFileName})
    ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
logger.add(new transports.Console());

module.exports = logger;
