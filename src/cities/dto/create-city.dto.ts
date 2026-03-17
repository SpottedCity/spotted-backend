import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateCityDto {
  @IsString()
  name: string;

  @IsString()
  voivodeship: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsObject()
  bounds?: any;
}
