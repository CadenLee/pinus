import * as os from 'os';
import * as admin from 'pinus-admin';
import * as utils from './utils';
import * as Constants from './constants';
import * as pathUtil from './pathUtil';
import * as starter from '../master/starter';
import { getLogger } from 'pinus-logger';import { Application } from '../application';
import { ConsoleService, IModule } from 'pinus-admin';
import { MasterWatcherModule } from '../modules/masterwatcher';
import { MonitorWatcherModule } from '../modules/monitorwatcher';
import { ConsoleModule } from '../modules/console';
 var logger = getLogger('pinus', __filename);

/**
 * Load admin modules
 */
export function loadModules(self : {app : Application , modules : Array<any>}, consoleService : ConsoleService)
{
    // load app register modules
    var _modules = self.app.get(Constants.KEYWORDS.MODULE);

    if (!_modules)
    {
        return;
    }

    var modules = [];
    for (var m in _modules)
    {
        modules.push(_modules[m]);
    }

    var record, moduleId, module;
    for (var i = 0, l = modules.length; i < l; i++)
    {
        record = modules[i];
        if (typeof record.module === 'function')
        {
            module = new record.module(record.opts, consoleService);
        } else
        {
            module = record.module;
        }

        moduleId = record.moduleId || module.moduleId;

        if (!moduleId)
        {
            logger.warn('ignore an unknown module.');
            continue;
        }

        consoleService.register(moduleId, module);
        self.modules.push(module);
    }
};

export function startModules(modules, cb)
{
    // invoke the start lifecycle method of modules

    if (!modules)
    {
        return;
    }
    startModule(null, modules, 0, cb);
};

/**
 * Append the default system admin modules
 */
export function registerDefaultModules(isMaster, app : Application, closeWatcher)
{
    if (!closeWatcher)
    {
        if (isMaster)
        {
            app.registerAdmin(MasterWatcherModule, { app: app });
        } else
        {
            app.registerAdmin(MonitorWatcherModule, { app: app });
        }
    }
    app.registerAdmin(admin.modules.watchServer, { app: app });
    app.registerAdmin(ConsoleModule, { app: app, starter: starter });
    if (app.enabled('systemMonitor'))
    {
        if (os.platform() !== Constants.PLATFORM.WIN)
        {
            app.registerAdmin(admin.modules.systemInfo);
            app.registerAdmin(admin.modules.nodeInfo);
        }
        app.registerAdmin(admin.modules.monitorLog, { path: pathUtil.getLogPath(app.getBase()) });
        app.registerAdmin(admin.modules.scripts, { app: app, path: pathUtil.getScriptPath(app.getBase()) });
        if (os.platform() !== Constants.PLATFORM.WIN)
        {
            app.registerAdmin(admin.modules.profiler);
        }
    }
};

var startModule = function (err, modules, index, cb)
{
    if (err || index >= modules.length)
    {
        utils.invokeCallback(cb, err);
        return;
    }

    var module = modules[index];
    if (module && typeof module.start === 'function')
    {
        module.start(function (err)
        {
            startModule(err, modules, index + 1, cb);
        });
    } else
    {
        startModule(err, modules, index + 1, cb);
    }
};
