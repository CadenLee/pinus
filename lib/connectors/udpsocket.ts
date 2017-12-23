import * as util from 'util';
import { default as handler } from './common/handler';
import { Package } from 'pomelo-protocol';
import * as EventEmitter from 'events';
import { getLogger } from 'pomelo-logger';
var logger = getLogger('pomelo', __filename);

var ST_INITED = 0;
var ST_WAIT_ACK = 1;
var ST_WORKING = 2;
var ST_CLOSED = 3;

export class UdpSocket extends EventEmitter
{
    id: string;
    socket: any;
    peer: any;
    host: string;
    port: number;
    remoteAddress: { ip: string; port: number };
    state: number;

    constructor(id, socket, peer)
    {
        super();
        this.id = id;
        this.socket = socket;
        this.peer = peer;
        this.host = peer.address;
        this.port = peer.port;
        this.remoteAddress = {
            ip: this.host,
            port: this.port
        };

        var self = this;
        this.on('package', function (pkg)
        {
            if (!!pkg)
            {
                pkg = Package.decode(pkg);
                handler(self, pkg);
            }
        });

        this.state = ST_INITED;
    };


    /**
     * Send byte data package to client.
     *
     * @param  {Buffer} msg byte data
     */
    send(msg)
    {
        if (this.state !== ST_WORKING)
        {
            return;
        }
        if (msg instanceof String)
        {
            msg = new Buffer(msg as string);
        } else if (!(msg instanceof Buffer))
        {
            msg = new Buffer(JSON.stringify(msg));
        }
        this.sendRaw(Package.encode(Package.TYPE_DATA, msg));
    };

    sendRaw(msg)
    {
        this.socket.send(msg, 0, msg.length, this.port, this.host, function (err, bytes)
        {
            if (!!err)
            {
                logger.error('send msg to remote with err: %j', err.stack);
                return;
            }
        });
    };

    sendForce(msg)
    {
        if (this.state === ST_CLOSED)
        {
            return;
        }
        this.sendRaw(msg);
    };

    handshakeResponse(resp)
    {
        if (this.state !== ST_INITED)
        {
            return;
        }
        this.sendRaw(resp);
        this.state = ST_WAIT_ACK;
    };

    sendBatch(msgs)
    {
        if (this.state !== ST_WORKING)
        {
            return;
        }
        var rs = [];
        for (var i = 0; i < msgs.length; i++)
        {
            var src = Package.encode(Package.TYPE_DATA, msgs[i]);
            rs.push(src);
        }
        this.sendRaw(Buffer.concat(rs));
    };

    disconnect()
    {
        if (this.state === ST_CLOSED)
        {
            return;
        }
        this.state = ST_CLOSED;
        this.emit('disconnect', 'the connection is disconnected.');
    };
}