import * as os from 'os';
import * as util from 'util';
import { exec } from 'child_process';
import { getLogger } from 'pinus-logger'; var logger = getLogger('pinus', __filename);
import * as Constants from './constants';
import { pinus } from '../pinus';


/**
 * Invoke callback with check
 */
export function invokeCallback(cb , ...args:any[])
{
    if (typeof cb === 'function')
    {
        var len = arguments.length;
        if (len == 1)
        {
            return cb();
        }

        if (len == 2)
        {
            return cb(arguments[1]);
        }

        if (len == 3)
        {
            return cb(arguments[1], arguments[2]);
        }

        if (len == 4)
        {
            return cb(arguments[1], arguments[2], arguments[3]);
        }

        var args = Array(len - 1);
        for (var i = 1; i < len; i++)
            args[i - 1] = arguments[i];
        cb.apply(null, args);
        // cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * Get the count of elements of object
 */
export function size(obj)
{
    var count = 0;
    for (var i in obj)
    {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function')
        {
            count++;
        }
    }
    return count;
};

/**
 * Check a string whether ends with another string
 */
export function endsWith(str, suffix)
{
    if (typeof str !== 'string' || typeof suffix !== 'string' ||
        suffix.length > str.length)
    {
        return false;
    }
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

/**
 * Check a string whether starts with another string
 */
export function startsWith(str, prefix)
{
    if (typeof str !== 'string' || typeof prefix !== 'string' ||
        prefix.length > str.length)
    {
        return false;
    }

    return str.indexOf(prefix) === 0;
};

/**
 * Compare the two arrays and return the difference.
 */
export function arrayDiff(array1, array2)
{
    var o = {};
    for (var i = 0, len = array2.length; i < len; i++)
    {
        o[array2[i]] = true;
    }

    var result = [];
    for (i = 0, len = array1.length; i < len; i++)
    {
        var v = array1[i];
        if (o[v]) continue;
        result.push(v);
    }
    return result;
};

/*
 * Date format
 */
export function format(date, format ?: string)
{
    format = format || 'MMddhhmm';
    var o = {
        "M+": date.getMonth() + 1, //month
        "d+": date.getDate(), //day
        "h+": date.getHours(), //hour
        "m+": date.getMinutes(), //minute
        "s+": date.getSeconds(), //second
        "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
        "S": date.getMilliseconds() //millisecond
    };

    if (/(y+)/.test(format))
    {
        format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o)
    {
        if (new RegExp("(" + k + ")").test(format))
        {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] :
                ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
};

/**
 * check if has Chinese characters.
 */
export function hasChineseChar(str)
{
    if (/.*[\u4e00-\u9fa5]+.*$/.test(str))
    {
        return true;
    } else
    {
        return false;
    }
};

/**
 * transform unicode to utf8
 */
export function unicodeToUtf8(str)
{
    var i, len, ch;
    var utf8Str = "";
    len = str.length;
    for (i = 0; i < len; i++)
    {
        ch = str.charCodeAt(i);

        if ((ch >= 0x0) && (ch <= 0x7F))
        {
            utf8Str += str.charAt(i);

        } else if ((ch >= 0x80) && (ch <= 0x7FF))
        {
            utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x800) && (ch <= 0xFFFF))
        {
            utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x10000) && (ch <= 0x1FFFFF))
        {
            utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF))
        {
            utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF))
        {
            utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        }

    }
    return utf8Str;
};

/**
 * Ping server to check if network is available
 *
 */
export function ping(host, cb)
{
    if (!isLocal(host))
    {
        var cmd = 'ping -w 15 ' + host;
        exec(cmd, function (err, stdout, stderr)
        {
            if (!!err)
            {
                cb(false);
                return;
            }
            cb(true);
        });
    } else
    {
        cb(true);
    }
};

/**
 * Check if server is exsit. 
 *
 */
export function checkPort(server, cb)
{
    if (!server.port && !server.clientPort)
    {
        this.invokeCallback(cb, 'leisure');
        return;
    }
    var self = this;
    var port = server.port || server.clientPort;
    var host = server.host;
    var generateCommand = function (self, host, port) {
        var cmd;
        var ssh_params = pinus.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS);
        if (!!ssh_params && Array.isArray(ssh_params))
        {
            ssh_params = ssh_params.join(' ');
        }
        else
        {
            ssh_params = "";
        }
        if (!self.isLocal(host))
        {
            cmd = util.format('ssh %s %s "netstat -an|awk \'{print $4}\'|grep %s|wc -l"', host, ssh_params, port);
        } else
        {
            cmd = util.format('netstat -an|awk \'{print $4}\'|grep %s|wc -l', port);
        }
        return cmd;
    };
    var cmd1 = generateCommand(self, host, port);
    var child = exec(cmd1, function (err, stdout, stderr)
    {
        if (err)
        {
            logger.error('command %s execute with error: %j', cmd1, err.stack);
            self.invokeCallback(cb, 'error');
        } else if (stdout.trim() !== '0')
        {
            self.invokeCallback(cb, 'busy');
        } else
        {
            port = server.clientPort;
            var cmd2 = generateCommand(self, host, port);
            exec(cmd2, function (err, stdout, stderr)
            {
                if (err)
                {
                    logger.error('command %s execute with error: %j', cmd2, err.stack);
                    self.invokeCallback(cb, 'error');
                } else if (stdout.trim() !== '0')
                {
                    self.invokeCallback(cb, 'busy');
                } else
                {
                    self.invokeCallback(cb, 'leisure');
                }
            });
        }
    });
};

export function isLocal(host)
{
    var app = pinus.app;
    if (!app)
    {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host);
    } else
    {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host) || host === app.master.host;
    }
};

/**
 * Load cluster server.
 *
 */
export function loadCluster(app, server, serverMap)
{
    var increaseFields = {};
    var host = server.host;
    var count = parseInt(server[Constants.RESERVED.CLUSTER_COUNT]);
    var seq = app.clusterSeq[server.serverType];
    if (!seq)
    {
        seq = 0;
        app.clusterSeq[server.serverType] = count;
    } else
    {
        app.clusterSeq[server.serverType] = seq + count;
    }

    for (var key in server)
    {
        var value = server[key].toString();
        if (value.indexOf(Constants.RESERVED.CLUSTER_SIGNAL) > 0)
        {
            var base = server[key].slice(0, -2);
            increaseFields[key] = base;
        }
    }

    var clone = function (src)
    {
        var rs: any = {};
        for (var key in src)
        {
            rs[key] = src[key];
        }
        return rs;
    };
    for (var i = 0, l = seq; i < count; i++ , l++)
    {
        var cserver = clone(server);
        cserver.id = Constants.RESERVED.CLUSTER_PREFIX + server.serverType + '-' + l;
        for (var k in increaseFields)
        {
            var v = parseInt(increaseFields[k]);
            cserver[k] = v + i;
        }
        serverMap[cserver.id] = cserver;
    }
};

//export function extends(origin, add)
//{
//    if (!add || !this.isObject(add)) return origin;

//    var keys = Object.keys(add);
//    var i = keys.length;
//    while (i--)
//    {
//        origin[keys[i]] = add[keys[i]];
//    }
//    return origin;
//};

export function headHandler(headBuffer)
{
    var len = 0;
    for (var i = 1; i < 4; i++)
    {
        if (i > 1)
        {
            len <<= 8;
        }
        len += headBuffer.readUInt8(i);
    }
    return len;
};

var inLocal = function (host)
{
    for (var index in localIps)
    {
        if (host === localIps[index])
        {
            return true;
        }
    }
    return false;
};

var localIps = function ()
{
    var ifaces = os.networkInterfaces();
    var ips = [];
    var func = function (details)
    {
        if (details.family === 'IPv4')
        {
            ips.push(details.address);
        }
    };
    for (var dev in ifaces)
    {
        ifaces[dev].forEach(func);
    }
    return ips;
}();

export function isObject(arg)
{
    return typeof arg === 'object' && arg !== null;
};

export function extendsObject(origin, add) {
    if (!add || !this.isObject(add)) return origin;
  
    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  };
export var promisify = util.promisify;