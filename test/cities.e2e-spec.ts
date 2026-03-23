import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CitiesController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const LIST_ROUTE = '/cities';
    const DETAILS_ROUTE = (id: string) => `/cities/${id}`;
    const VOIVODESHIP_ROUTE = (name: string) => `/cities/voivodeship/${name}`;

    const cleanupDb = async () => {
        await prisma.subscription.deleteMany();
        await prisma.flag.deleteMany();
        await prisma.vote.deleteMany();
        await prisma.comment.deleteMany();
        await prisma.post.deleteMany();
        await prisma.category.deleteMany();
        await prisma.city.deleteMany();
        await prisma.userReputation.deleteMany();
        await prisma.user.deleteMany();
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        await app.init();
        prisma = moduleFixture.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        await cleanupDb();
    });

    afterAll(async () => {
        await app.close();
    });

    const createCityPayload = (
        overrides?: Partial<{
            name: string;
            voivodeship: string;
            latitude: number;
            longitude: number;
            bounds: Record<string, number>;
        }>,
    ) => {
        const n = uid();
        return {
            name: `Miasto-${n}`,
            voivodeship: 'kujawsko-pomorskie',
            latitude: 53.1235,
            longitude: 18.0084,
            ...overrides,
        };
    };

    const seedCity = async (
        overrides?: Partial<{
            name: string;
            voivodeship: string;
            latitude: number;
            longitude: number;
            bounds: Record<string, number>;
        }>,
    ) => {
        return prisma.city.create({
            data: createCityPayload(overrides),
        });
    };

    describe('GET /cities', () => {
        it('should return cities list', async () => {
            const c1 = await seedCity({ name: `Bydgoszcz-${uid()}` });
            const c2 = await seedCity({ name: `Toruń-${uid()}` });

            const res = await request(app.getHttpServer())
                .get(LIST_ROUTE)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);

            const ids = res.body.map((x: any) => x.id);
            expect(ids).toContain(c1.id);
            expect(ids).toContain(c2.id);
        });
    });

    describe('GET /cities/voivodeship/:voivodeship', () => {
        it('should filter cities by voivodeship', async () => {
            const targetVoivodeship = `pomorskie-${uid()}`;
            const matched = await seedCity({
                voivodeship: targetVoivodeship,
                name: `Gdańsk-${uid()}`,
            });
            await seedCity({
                voivodeship: `mazowieckie-${uid()}`,
                name: `Warszawa-${uid()}`,
            });

            const res = await request(app.getHttpServer())
                .get(VOIVODESHIP_ROUTE(targetVoivodeship))
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].id).toBe(matched.id);
            expect(res.body[0].voivodeship).toBe(targetVoivodeship);
        });
    });

    describe('GET /cities/:id', () => {
        it('should return city details by id', async () => {
            const city = await seedCity({
                bounds: {
                    minLat: 53.0,
                    maxLat: 54.0,
                    minLng: 17.5,
                    maxLng: 18.5,
                },
            });

            const res = await request(app.getHttpServer())
                .get(DETAILS_ROUTE(city.id))
                .expect(200);

            expect(res.body.id).toBe(city.id);
            expect(res.body.name).toBe(city.name);
            expect(res.body.voivodeship).toBe(city.voivodeship);
            expect(res.body.latitude).toBe(city.latitude);
            expect(res.body.longitude).toBe(city.longitude);
            expect(res.body.bounds).toEqual(city.bounds);
        });
    });

    describe('POST /cities', () => {
        it('should create city', async () => {
            const payload = createCityPayload({
                bounds: {
                    minLat: 53.1,
                    maxLat: 53.2,
                    minLng: 18.0,
                    maxLng: 18.1,
                },
            });

            const res = await request(app.getHttpServer())
                .post(LIST_ROUTE)
                .send(payload)
                .expect(201);

            expect(res.body.id).toEqual(expect.any(String));
            expect(res.body.name).toBe(payload.name);
            expect(res.body.voivodeship).toBe(payload.voivodeship);
            expect(res.body.latitude).toBe(payload.latitude);
            expect(res.body.longitude).toBe(payload.longitude);
            expect(res.body.bounds).toEqual(payload.bounds);

            const cityInDb = await prisma.city.findUnique({
                where: { name: payload.name },
            });

            expect(cityInDb).toBeDefined();
            expect(cityInDb?.name).toBe(payload.name);
        });

        it('should reject invalid latitude type', async () => {
            const payload = {
                ...createCityPayload(),
                latitude: '53.1235',
            };

            await request(app.getHttpServer())
                .post(LIST_ROUTE)
                .send(payload)
                .expect(400);
        });

        it('should reject missing name', async () => {
            const payload = createCityPayload();
            const { name, ...withoutName } = payload;

            await request(app.getHttpServer())
                .post(LIST_ROUTE)
                .send(withoutName)
                .expect(400);
        });

        it('should reject extra fields because whitelist is enabled', async () => {
            const payload = {
                ...createCityPayload(),
                extraField: 'nope',
            };

            await request(app.getHttpServer())
                .post(LIST_ROUTE)
                .send(payload)
                .expect(400);
        });
    });
});