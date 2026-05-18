import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateAliasDto } from './dto/create-alias.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.products.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }

  @Post(':id/aliases')
  addAlias(@Param('id') id: string, @Body() dto: CreateAliasDto) {
    return this.products.addAlias(id, dto);
  }

  @Delete(':id/aliases/:aliasId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAlias(@Param('id') id: string, @Param('aliasId') aliasId: string) {
    return this.products.removeAlias(id, aliasId);
  }
}
