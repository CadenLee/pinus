import * as util from 'util';
import { EventEmitter } from 'events';

var ST_INITED = 0;
var ST_CLOSED = 1;

/**
 * Socket class that wraps socket.io socket to provide unified interface for up level.
 */
export class SioSocket extends EventEmitter
{
    id: number;
    socket: any;
    remoteAddress: { ip: string, port: number };
    state: number;

    constructor(id, socket)
    {
        super();
        this.id = id;
        this.socket = socket;
        this.remoteAddress = {
            ip: socket.handshake.address.address,
            port: socket.handshake.address.port
        };

        var self = this;

        socket.on('disconnect', this.emit.bind(this, 'disconnect'));

        socket.on('error', this.emit.bind(this, 'error'));

        socket.on('message', function (msg)
        {
            self.emit('message', msg);
        });

        this.state = ST_INITED;

        // TODO: any other events?
    };



    send(msg)
    {
        if (this.state !== ST_INITED)
        {
            return;
        }
        if (typeof msg !== 'string')
        {
            msg = JSON.stringify(msg);
        }
        this.socket.send(msg);
    };

    disconnect()
    {
        if (this.state === ST_CLOSED)
        {
            return;
        }

        this.state = ST_CLOSED;
        this.socket.disconnect();
    };

    sendBatch(msgs)
    {
        this.send(encodeBatch(msgs));
    };
}

/**
 * Encode batch msg to client
 */
var encodeBatch = function (msgs)
{
    var res = '[', msg;
    for (var i = 0, l = msgs.length; i < l; i++)
    {
        if (i > 0)
        {
            res += ',';
        }
        msg = msgs[i];
        if (typeof msg === 'string')
        {
            res += msg;
        } else
        {
            res += JSON.stringify(msg);
        }
    }
    res += ']';
    return res;
};
