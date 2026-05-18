import { Controller, Get, Query } from '@nestjs/common';

import { AlertsService } from './alerts.service';
import { ExpiringQueryDto } from './dto/expiring-query.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get('expiring')
  list(@Query() q: ExpiringQueryDto) {
    return this.alerts.listExpiring(q.days);
  }

  @Get('expiring/count')
  count(@Query() q: ExpiringQueryDto) {
    return this.alerts.countExpiring(q.days);
  }
}
