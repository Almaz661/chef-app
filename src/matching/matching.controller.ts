import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { ResolveQueueItemDto } from './dto/resolve-queue-item.dto';
import { MatchingService } from './matching.service';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('queue')
  listQueue() {
    return this.matching.listQueue();
  }

  @Post('queue/:id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveQueueItemDto) {
    return this.matching.resolveQueueItem(id, dto);
  }
}
