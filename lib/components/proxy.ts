/**
 * Component for proxy.
 * Generate proxies for rpc client.
 */
import * as crc from 'crc';
import * as utils from '../util/utils';
import { default as events } from '../util/events';
import { RpcClient , createClient} from 'pinus-rpc';
import * as pathUtil from '../util/pathUtil';
import * as Constants from '../util/constants';
import { getLogger } from 'pinus-logger';
import { Application } from '../application';
import { IComponent } from '../interfaces/Component';
var logger = getLogger('pinus', __filename);


/**
 * Proxy component class
 *
 * @param {Object} app  current application context
 * @param {Object} opts construct parameters
 */
export class ProxyComponent implements IComponent
{
    app: Application;
    opts: any;
    client: RpcClient;
    constructor(app, opts)
    {
        opts = opts || {};
        // proxy default config
        // cacheMsg is deprecated, just for compatibility here.
        opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
        opts.interval = opts.interval || 30;
        opts.router = genRouteFun();
        opts.context = app;
        opts.routeContext = app;
        if (app.enabled('rpcDebugLog'))
        {
            opts.rpcDebugLog = true;
            opts.rpcLogger = getLogger('rpc-debug', __filename);
        }

        this.app = app;
        this.opts = opts;
        this.client = genRpcClient(this.app, opts);
        this.app.event.on(events.ADD_SERVERS, this.addServers.bind(this));
        this.app.event.on(events.REMOVE_SERVERS, this.removeServers.bind(this));
        this.app.event.on(events.REPLACE_SERVERS, this.replaceServers.bind(this));
    };

    name = '__proxy__';

    /**
     * Proxy component lifecycle function
     *
     * @param {Function} cb
     * @return {Void}
     */
    start(cb)
    {
        if (this.opts.enableRpcLog)
        {
            logger.warn('enableRpcLog is deprecated in 0.8.0, please use app.rpcFilter(pinus.rpcFilters.rpcLog())');
        }
        var rpcBefores = this.app.get(Constants.KEYWORDS.RPC_BEFORE_FILTER);
        var rpcAfters = this.app.get(Constants.KEYWORDS.RPC_AFTER_FILTER);
        var rpcErrorHandler = this.app.get(Constants.RESERVED.RPC_ERROR_HANDLER);

        if (!!rpcBefores)
        {
            this.client.before(rpcBefores);
        }
        if (!!rpcAfters)
        {
            this.client.after(rpcAfters);
        }
        if (!!rpcErrorHandler)
        {
            this.client.setErrorHandler(rpcErrorHandler);
        }
        process.nextTick(cb);
    };

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    afterStart(cb)
    {
        var self = this;

        Object.defineProperty(this.app, 'rpc', {
            get : function ()
            {
                return self.client.proxies.user;
            }
        });

        Object.defineProperty(this.app, 'sysrpc', {
            get : function ()
            {
                return self.client.proxies.sys;
            }
        });
        this.app.rpcInvoke =  this.client.rpcInvoke.bind(this.client);

        this.client.start(cb);
    };

    /**
     * Add remote server to the rpc client.
     *
     * @param {Array} servers server info list, {id, serverType, host, port}
     */
    addServers(servers)
    {
        if (!servers || !servers.length)
        {
            return;
        }

        genProxies(this.client, this.app, servers);
        this.client.addServers(servers);
    };

    /**
     * Remove remote server from the rpc client.
     *
     * @param  {Array} ids server id list
     */
    removeServers(ids)
    {
        this.client.removeServers(ids);
    };

    /**
     * Replace remote servers from the rpc client.
     *
     * @param  {Array} ids server id list
     */
    replaceServers(servers)
    {
        if (!servers || !servers.length)
        {
            return;
        }

        // update proxies
        this.client.proxies = {};
        genProxies(this.client, this.app, servers);

        this.client.replaceServers(servers);
    };

    /**
     * Proxy for rpc client rpcInvoke.
     *
     * @param {String}   serverId remote server id
     * @param {Object}   msg      rpc message: {serverType: serverType, service: serviceName, method: methodName, args: arguments}
     * @param {Function} cb      callback function
     */
    rpcInvoke(serverId, msg, cb)
    {
        this.client.rpcInvoke(serverId, msg, cb);
    };
}

/**
 * Generate rpc client
 *
 * @param {Object} app current application context
 * @param {Object} opts contructor parameters for rpc client
 * @return {Object} rpc client
 */
var genRpcClient = function (app, opts)
{
    opts.context = app;
    opts.routeContext = app;
    if (!!opts.rpcClient)
    {
        return opts.rpcClient.create(opts);
    } else
    {
        return createClient(opts);
    }
};

/**
 * Generate proxy for the server infos.
 *
 * @param  {Object} client rpc client instance
 * @param  {Object} app    application context
 * @param  {Array} sinfos server info list
 */
var genProxies = function (client, app, sinfos)
{
    var item;
    for (var i = 0, l = sinfos.length; i < l; i++)
    {
        item = sinfos[i];
        if (hasProxy(client, item))
        {
            continue;
        }
        client.addProxies(getProxyRecords(app, item));
    }
};

/**
 * Check a server whether has generated proxy before
 *
 * @param  {Object}  client rpc client instance
 * @param  {Object}  sinfo  server info
 * @return {Boolean}        true or false
 */
var hasProxy = function (client, sinfo)
{
    var proxy = client.proxies;
    return !!proxy.sys && !!proxy.sys[sinfo.serverType];
};

/**
 * Get proxy path for rpc client.
 * Iterate all the remote service path and create remote path record.
 *
 * @param {Object} app current application context
 * @param {Object} sinfo server info, format: {id, serverType, host, port}
 * @return {Array}     remote path record array
 */
var getProxyRecords = function (app, sinfo)
{
    var records = [],
        appBase = app.getBase(),
        record;
    // sys remote service path record
    if (app.isFrontend(sinfo))
    {
        record = pathUtil.getSysRemotePath('frontend');
    } else
    {
        record = pathUtil.getSysRemotePath('backend');
    }
    if (record)
    {
        records.push(pathUtil.remotePathRecord('sys', sinfo.serverType, record));
    }

    // user remote service path record
    record = pathUtil.getUserRemotePath(appBase, sinfo.serverType);
    if (record)
    {
        records.push(pathUtil.remotePathRecord('user', sinfo.serverType, record));
    }

    return records;
};

var genRouteFun = function ()
{
    return function (session, msg, app, cb)
    {
        var routes = app.get('__routes__');

        if (!routes)
        {
            defaultRoute(session, msg, app, cb);
            return;
        }

        var type = msg.serverType,
            route = routes[type] || routes['default'];

        if (route)
        {
            route(session, msg, app, cb);
        } else
        {
            defaultRoute(session, msg, app, cb);
        }
    };
};

var defaultRoute = function (session, msg, app, cb)
{
    var list = app.getServersByType(msg.serverType);
    if (!list || !list.length)
    {
        cb(new Error('can not find server info for type:' + msg.serverType));
        return;
    }

    var uid = session ? (session.uid || '') : '';
    var index = Math.abs(crc.crc32(uid.toString())) % list.length;
    utils.invokeCallback(cb, null, list[index].id);
};
