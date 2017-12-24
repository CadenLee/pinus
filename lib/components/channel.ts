import { ChannelService } from '../common/service/channelService';
import { IComponent } from '../interfaces/Component';
import { Application } from '../application';

export class ChannelComponent extends ChannelService implements IComponent
{
  constructor(app: Application, opts)
  {
    super(app , opts);
    app.set('channelService', this, true);
  };
  name = '__channel__';
}