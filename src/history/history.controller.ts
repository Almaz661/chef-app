import { Controller, Get, Param, Query } from '@nestjs/common';

import { ListHistoryDto, StatsQueryDto } from './dto/list-history.dto';
import { HistoryService } from './history.service';

@Controller()
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get('cooking/history')
  list(@Query() filter: ListHistoryDto) {
    return this.history.listEvents(filter);
  }

  @Get('cooking/stats')
  stats(@Query() q: StatsQueryDto) {
    return this.history.stats(q.days);
  }

  @Get('recipes/:id/cooking-history')
  forRecipe(@Param('id') id: string) {
    return this.history.forRecipe(id);
  }
}
