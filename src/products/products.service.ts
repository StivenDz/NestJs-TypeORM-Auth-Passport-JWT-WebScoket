import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { isUUID } from 'class-validator';
import { ProductImage, Product } from './entities';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger("ProductsService");

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) {

  }

  public async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;
      const product = this.productRepository.create({
        ...productDetails,
        images: images.map(image => this.productImageRepository.create({ url: image }))
      });
      await this.productRepository.save(product);
      return { ...product, images };
    } catch (err) {
      this.handleDBExceptions(err);
    }
  }

  public async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true
      }
    });

    return products.map(product => (
      {
        ...product,
        images: product.images.map(image => image.url)
      }
    ))
  }

  public async findOne(term: string) {
    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder("product");
      product = await queryBuilder
        .where(`UPPER(title) =:title OR slug =:slug`, {
          title: term.toUpperCase(),
          slug: term.toLowerCase()
        })
        .leftJoinAndSelect("product.images", "productImages")
        .getOne();
    }

    if (!product) throw new NotFoundException(`Product with ${term} not found`);

    return product;
  }

  public async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);

    return {
      ...rest,
      images: images.map(img => img.url)
    }
  }

  public async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...toUpdate } = updateProductDto;


    const product = await this.productRepository.preload({
      id,
      ...toUpdate
      // images: []
    });
    if (!product) throw new NotFoundException(`Product with id ${id} not found`);

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();


    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } })

        product.images = images.map(image => this.productImageRepository.create({ url: image }))
      }

      // await this.productRepository.save(product);
      await queryRunner.manager.save(product)
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id); 

    } catch (err) {
      this.handleDBExceptions(err);
    }

  }

  public async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  public async deleteAllProduct(){
    const query = this.productRepository.createQueryBuilder("product");

    try{  
      return await query
        .delete()
        .where({})
        .execute();
      
    }catch(err){

    }
  }

  private handleDBExceptions(err: any) {
    if (err.code === "23505")
      throw new BadRequestException(err.detail);

    this.logger.error(err);
    throw new InternalServerErrorException("Unexpected Error");
  }
}