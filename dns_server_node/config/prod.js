module.exports = {
    udp: {
        bufferSize: 1024,
        proccessSocketNum: 5,  //每个DNS地址对应多少个socket
    },
    dns: {
        default: ['8.8.8.8', '116.116.116.116']
    },
    master: {
        address: '127.0.0.1',
        port: 5005,
    },
    redis: {
        //自定义DNS
        custom: {
            host: '127.0.0.1',   // Redis host
            port: 6379,          // Redis port
            family: 4,           // 4 (IPv4) or 6 (IPv6)
            password: '123456',
            db: 0
        },
        //缓存DNS
        cache: {
            host: '127.0.0.1',   // Redis host
            port: 6379,          // Redis port
            family: 4,           // 4 (IPv4) or 6 (IPv6)
            password: '123456',
            db: 1
        },
    },
};
