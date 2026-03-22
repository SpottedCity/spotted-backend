import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CategoriesController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const LIST_ROUTE = '/categories';
    const DETAILS_ROUTE = (slug: string) => `/categories/${slug}`;

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

    const seedCategory = async (
        overrides?: Partial<{
            name: string;
            slug: string;
            color: string;
            icon: string;
        }>,
    ) => {
        const n = uid();
        return prisma.category.create({
            data: {
                name: `Kategoria-${n}`,
                slug: `kategoria-${n}`,
                color: '#ff0000',
                icon: 'alert-circle',
                ...overrides,
            },
        });
    };

    describe('GET /categories', () => {
        it('should return categories list', async () => {
            const c1 = await seedCategory({ name: 'Awaria', slug: `awaria-${uid()}` });
            const c2 = await seedCategory({ name: 'Zguba', slug: `zguba-${uid()}` });

            const res = await request(app.getHttpServer())
                .get(LIST_ROUTE)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);

            const ids = res.body.map((x: any) => x.id);
            expect(ids).toContain(c1.id);
            expect(ids).toContain(c2.id);
        });
    });

    describe('GET /categories/:slug', () => {
        it('should return category details by slug', async () => {
            const category = await seedCategory({
                name: 'Szczegóły',
                slug: `szczegoly-${uid()}`,
            });

            const res = await request(app.getHttpServer())
                .get(DETAILS_ROUTE(category.slug))
                .expect(200);

            expect(res.body.id).toBe(category.id);
            expect(res.body.name).toBe('Szczegóły');
            expect(res.body.slug).toBe(category.slug);
        });
    });
});
