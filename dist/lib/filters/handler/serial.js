"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Filter to keep request sequence.
 */
const pinus_logger_1 = require("pinus-logger");
var logger = pinus_logger_1.getLogger('pinus', __filename);
const taskManager = require("../../common/manager/taskManager");
class SerialFilter {
    constructor(timeout) {
        this.timeout = timeout;
    }
    ;
    /**
     * request serialization after filter
     */
    before(routeRecord, msg, session, next) {
        taskManager.addTask(session.id, function (task) {
            session.__serialTask__ = task;
            next();
        }, function () {
            logger.error('[serial filter] msg timeout, msg:' + JSON.stringify(msg));
        }, this.timeout);
    }
    ;
    /**
     * request serialization after filter
     */
    after(err, routeRecord, msg, session, resp, next) {
        var task = session.__serialTask__;
        if (task) {
            if (!task.done() && !err) {
                err = new Error('task time out. msg:' + JSON.stringify(msg));
            }
        }
        next(err);
    }
    ;
}
exports.SerialFilter = SerialFilter;
//# sourceMappingURL=serial.js.map