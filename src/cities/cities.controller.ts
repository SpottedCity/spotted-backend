import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';

@Controller('cities')
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Get()
  async getCities() {
    return this.citiesService.getCities();
  }

  @Get('voivodeship/:voivodeship')
  async getCitiesByVoivodeship(@Param('voivodeship') voivodeship: string) {
    return this.citiesService.getCitiesByVoivodeship(voivodeship);
  }

  @Get(':id')
  async getCityById(@Param('id') id: string) {
    return this.citiesService.getCityById(id);
  }

  @Post()
  async createCity(@Body() createCityDto: CreateCityDto) {
    return this.citiesService.createCity(createCityDto);
  }
}
