import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import TransformDecorator from 'src/shared/decorators/transform.decorator';
import TransformSearchBase from 'src/shared/decorators/transformSearchBase.decorator';

export default class SearchBaseDto {
  // @Transform(e => parseInt(e.value))
  // @Min(0)

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  keyword?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  @TransformSearchBase('skipCount')
  skipCount?: number;

  // @Transform(value => {
  //   const maxResult = Number(value) * 1 || 10;
  //   return maxResult;
  // })
  // @IsNumber()
  // @Min(1)
  @IsOptional()
  @ApiProperty({ required: false })
  @TransformSearchBase('maxResult')
  maxResult?: number;

  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({
    required: false,
    description: '+examname1,-examname2 ',
  })
  @TransformDecorator('checkbox_string')
  sort?: string[];

  @IsOptional()
  @ApiProperty({
    required: false,
    description: '+examFields | -examFields | examFields',
  })
  @TransformDecorator('checkbox_string')
  fields?: string[];

  get skip() {
    const skipCount = this.skipCount * 1 || 1;
    const maxResult = this.maxResult * 1 || 10;
    const skip = (skipCount - 1) * maxResult;
    return skip;
  }

  get take() {
    console.log('this.maxResult', this.maxResult);
    const maxResult = this.maxResult * 1 || 10;
    return maxResult;
  }

  get sortSql() {
    const sort = this.sort;
    console.log('sort', sort);
    if (sort && sort.length) {
      // sort =>+name,-id
      let object = {};
      //   {
      //     "user.name": "ASC",
      //     "user.id": "DESC"
      // }
      sort.map((item) => {
        if (item.startsWith('-')) {
          item = item.replace('-', '');
          let newItem = { [item]: 'ASC' };
          object = { ...object, ...newItem };
        } else {
          item = item.replace(' ', '');
          let newItem = { [item]: 'DESC' };
          object = { ...object, ...newItem };
        }
      });
      return object;
    }
    return undefined;
  }
}
