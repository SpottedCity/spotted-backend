import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  async createCity(createCityDto: CreateCityDto) {
    return this.prisma.city.create({
      data: createCityDto,
    });
  }

  async getCities() {
    return this.prisma.city.findMany({
      select: {
        id: true,
        name: true,
        voivodeship: true,
        latitude: true,
        longitude: true,
      },
    });
  }

  async getCitiesByVoivodeship(voivodeship: string) {
    return this.prisma.city.findMany({
      where: { voivodeship },
      select: {
        id: true,
        name: true,
        voivodeship: true,
        latitude: true,
        longitude: true,
      },
    });
  }

  async getCityById(id: string) {
    return this.prisma.city.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        voivodeship: true,
        latitude: true,
        longitude: true,
        bounds: true,
      },
    });
  }

  async getCityByName(name: string) {
    return this.prisma.city.findUnique({
      where: { name },
    });
  }
}
