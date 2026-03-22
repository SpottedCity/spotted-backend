import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SubscriptionsController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const CREATE_SUBSCRIPTION_ROUTE = '/subscriptions';
    const MY_SUBSCRIPTIONS_ROUTE = '/subscriptions';
    const DELETE_SUBSCRIPTION_ROUTE = (id: string) => `/subscriptions/${id}`;

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

    const signUpUser = async (
        overrides?: Partial<{
            email: string;
            password: string;
            firstName: string;
            lastName: string;
        }>,
    ) => {
        const n = uid();
        const payload = {
            email: `user-${n}@example.com`,
            password: 'password123',
            firstName: 'Jan',
            lastName: 'Testowy',
            ...overrides,
        };

        const res = await request(app.getHttpServer())
            .post('/auth/signup')
            .send(payload)
            .expect(201);

        return {
            token: res.body.accessToken as string,
            user: res.body.user,
        };
    };

    const createCategory = async () => {
        const n = uid();
        return prisma.category.create({
            data: {
                name: `Kategoria-${n}`,
                slug: `kategoria-${n}`,
                color: '#ff0000',
                icon: 'alert-circle',
            },
        });
    };

    describe('category subscriptions', () => {
        it('should reject subscribe without token', async () => {
            const category = await createCategory();

            await request(app.getHttpServer())
                .post(CREATE_SUBSCRIPTION_ROUTE)
                .send({ categoryId: category.id })
                .expect(401);
        });

        it('should subscribe authenticated user to category', async () => {
            const user = await signUpUser();
            const category = await createCategory();

            const res = await request(app.getHttpServer())
                .post(CREATE_SUBSCRIPTION_ROUTE)
                .set('Authorization', `Bearer ${user.token}`)
                .send({ categoryId: category.id })
                .expect(201);

            expect(res.body).toBeDefined();

            const subInDb = await prisma.subscription.findFirst({
                where: {
                    userId: user.user.id,
                    categoryId: category.id,
                },
            });

            expect(subInDb).toBeDefined();
            expect(subInDb?.userId).toBe(user.user.id);
            expect(subInDb?.categoryId).toBe(category.id);
        });

        it('should reject duplicate category subscription from same user', async () => {
            const user = await signUpUser();
            const category = await createCategory();

            await request(app.getHttpServer())
                .post(CREATE_SUBSCRIPTION_ROUTE)
                .set('Authorization', `Bearer ${user.token}`)
                .send({ categoryId: category.id })
                .expect(201);

            await request(app.getHttpServer())
                .post(CREATE_SUBSCRIPTION_ROUTE)
                .set('Authorization', `Bearer ${user.token}`)
                .send({ categoryId: category.id })
                .expect(400);
        });

        it('should unsubscribe authenticated user', async () => {
            const user = await signUpUser();
            const category = await createCategory();

            const subscription = await prisma.subscription.create({
                data: {
                    userId: user.user.id,
                    categoryId: category.id,
                },
            });

            await request(app.getHttpServer())
                .delete(DELETE_SUBSCRIPTION_ROUTE(subscription.id))
                .set('Authorization', `Bearer ${user.token}`)
                .expect(200);

            const subInDb = await prisma.subscription.findFirst({
                where: {
                    id: subscription.id,
                },
            });

            expect(subInDb).toBeNull();
        });
    });

    describe('my subscriptions', () => {
        it('should return current user subscriptions', async () => {
            const user = await signUpUser();
            const category1 = await createCategory();
            const category2 = await createCategory();

            await prisma.subscription.createMany({
                data: [
                    { userId: user.user.id, categoryId: category1.id },
                    { userId: user.user.id, categoryId: category2.id },
                ],
            });

            const res = await request(app.getHttpServer())
                .get(MY_SUBSCRIPTIONS_ROUTE)
                .set('Authorization', `Bearer ${user.token}`)
                .expect(200);

            expect(res.body).toBeDefined();
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
        });
    });
});
