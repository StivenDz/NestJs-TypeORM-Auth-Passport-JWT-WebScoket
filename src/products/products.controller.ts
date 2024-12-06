import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators';
import { User } from 'src/auth/entities/user.entity';
// import { ParseUUIDPipe } from 'src/common/pipes/parse-uuid/parse-uuid.pipe';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Auth()
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser() user:User
  ) {
    return this.productsService.create(createProductDto, user);
  }

  @Get()
  findAll(
    @Query() paginationDto:PaginationDto
  ) {
    return this.productsService.findAll(paginationDto);
  }

  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.productsService.findOnePlain(term);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateProductDto: UpdateProductDto,
    @GetUser() user:User
  ) {
    return this.productsService.update(id, updateProductDto,user);
  }

  @Delete(':id')
  @Auth()
  remove(@Param('id',ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
