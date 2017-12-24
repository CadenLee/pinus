import { ConnectionService } from '../common/service/connectionService';
import { Application } from '../application';
import { IComponent } from '../interfaces/Component';



export class ConnectionComponent extends ConnectionService implements IComponent
{
    name = '__connection__';

    constructor(app)
    {
        super(app);
    };
}