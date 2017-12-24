import { IPushScheduler } from "../interfaces/IPushScheduler";
import { Application } from "../application";
import { isFunction } from "util";
import { getLogger } from 'pomelo-logger';
var logger = getLogger('pomelo', __filename);

export type IPushSelector = (reqId : number, route : string, msg : any, recvs : number[], opts : any)=>number

export class MultiPushScheduler implements IPushScheduler
{
    app: Application;
    
    selector : IPushSelector;

    scheduler :{[id:number]:IPushScheduler};

    constructor(app, opts)
    {
        opts = opts || {};
        var scheduler = opts.scheduler;
        if (Array.isArray(scheduler))
        {
            this.scheduler = {};
            scheduler.forEach(function (sch)
            {
                if (typeof sch.scheduler === 'function')
                {
                    this.scheduler[sch.id] = new sch.scheduler(app, sch.options);
                } else
                {
                    this.scheduler[sch.id] = sch.scheduler;
                }
            });

            if(!isFunction(opts.selector))
            {
                throw new Error("MultiPushScheduler必须提供selector参数");
            }

            this.selector = opts.selector;
        }
        else
        {
            throw new Error("MultiPushScheduler必须提供scheduler参数");
        }

        this.app = app;
    };



    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    async start()
    {
        for (var k in this.scheduler)
        {
            var sch = this.scheduler[k];
            if (typeof sch.start === 'function')
            {
                await sch.start();
            }
        }
    };

    /**
     * Component lifecycle callback
     *
     * @param {Function} cb
     * @return {Void}
     */
    async stop()
    {
        for (var k in this.scheduler)
        {
            var sch = this.scheduler[k];
            if (typeof sch.stop === 'function')
            {
                await sch.stop();
            }
        }
    };

    /**
     * Schedule how the message to send.
     *
     * @param  {Number}   reqId request id
     * @param  {String}   route route string of the message
     * @param  {Object}   msg   message content after encoded
     * @param  {Array}    recvs array of receiver's session id
     * @param  {Object}   opts  options
     */

    schedule(reqId, route, msg, recvs, opts, cb)
    {
        var self = this;
        var id = self.selector(reqId, route, msg, recvs, opts);
    
        if (self.scheduler[id])
        {
            self.scheduler[id].schedule(reqId, route, msg, recvs, opts, cb);
        } else
        {
            logger.error('invalid pushScheduler id, id: %j', id);
        }
    };
}