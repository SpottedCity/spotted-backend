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

    const createCity = async () => {
        const n = uid();
        return prisma.city.create({
            data: {
                name: `Miasto-${n}`,
                voivodeship: 'kujawsko-pomorskie',
                latitude: 53.1235,
                longitude: 18.0084,
            },
        });
    };

    const seedPost = async (params: {
        authorId: string;
        categoryId: string;
        cityId: string;
    }) => {
        return prisma.post.create({
            data: {
                title: 'Seed post',
                description: 'Seed description',
                latitude: 53.1235,
                longitude: 18.0084,
                imageUrl: null,
                images: [],
                isActive: true,
                upvotes: 0,
                downvotes: 0,
                authorId: params.authorId,
                categoryId: params.categoryId,
                cityId: params.cityId,
            },
        });
    };

    describe('POST /subscriptions', () => {
        it('should reject subscribe without token', async () => {
            const category = await createCategory();

            await request(app.getHttpServer())
                .post(CREATE_SUBSCRIPTION_ROUTE)
                .send({ categoryId: category.id })
                .expect(401);
        });

        it('should reject empty subscription payload', async () => {
            const user = await signUpUser();

            await request(app.getHttpServer())
                .post(CREATE_SUBSCRIPTION_ROUTE)
                .set('Authorization', `Bearer ${user.token}`)
                .send({})
                .expect(400);
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

        it('should subscribe authenticated user to post', async () => {
            const owner = await signUpUser();
            const subscriber = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const res = await request(app.getHttpServer())
                .post(CREATE_SUBSCRIPTION_ROUTE)
                .set('Authorization', `Bearer ${subscriber.token}`)
                .send({ postId: post.id })
                .expect(201);

            expect(res.body.postId).toBe(post.id);
            expect(res.body.userId).toBe(subscriber.user.id);

            const subInDb = await prisma.subscription.findFirst({
                where: {
                    userId: subscriber.user.id,
                    postId: post.id,
                },
            });

            expect(subInDb).toBeDefined();
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
    });

    describe('GET /subscriptions', () => {
        it('should return empty array for user without subscriptions', async () => {
            const user = await signUpUser();

            const res = await request(app.getHttpServer())
                .get(MY_SUBSCRIPTIONS_ROUTE)
                .set('Authorization', `Bearer ${user.token}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toEqual([]);
        });

        it('should return current user subscriptions with relations', async () => {
            const owner = await signUpUser();
            const user = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await prisma.subscription.createMany({
                data: [
                    { userId: user.user.id, categoryId: category.id },
                    { userId: user.user.id, postId: post.id },
                ],
            });

            const res = await request(app.getHttpServer())
                .get(MY_SUBSCRIPTIONS_ROUTE)
                .set('Authorization', `Bearer ${user.token}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);

            const categorySub = res.body.find((x: any) => x.categoryId === category.id);
            const postSub = res.body.find((x: any) => x.postId === post.id);

            expect(categorySub?.category?.id).toBe(category.id);
            expect(categorySub?.category?.name).toBe(category.name);

            expect(postSub?.post?.id).toBe(post.id);
            expect(postSub?.post?.title).toBe(post.title);
        });
    });

    describe('DELETE /subscriptions/:id', () => {
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

        it('should reject unsubscribing someone else subscription', async () => {
            const owner = await signUpUser();
            const attacker = await signUpUser();
            const category = await createCategory();

            const subscription = await prisma.subscription.create({
                data: {
                    userId: owner.user.id,
                    categoryId: category.id,
                },
            });

            await request(app.getHttpServer())
                .delete(DELETE_SUBSCRIPTION_ROUTE(subscription.id))
                .set('Authorization', `Bearer ${attacker.token}`)
                .expect(400);

            const subInDb = await prisma.subscription.findUnique({
                where: { id: subscription.id },
            });

            expect(subInDb).toBeDefined();
        });
    });
});