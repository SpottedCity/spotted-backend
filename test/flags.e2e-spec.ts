import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('FlagsController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const CREATE_FLAG_ROUTE = '/flags';
    const FLAG_LIST_ROUTE = '/flags';
    const FLAGS_BY_POST_ROUTE = (postId: string) => `/flags/post/${postId}`;

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
                name: `Awarie-${n}`,
                slug: `awarie-${n}`,
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
        title?: string;
        description?: string;
    }) => {
        return prisma.post.create({
            data: {
                title: params.title ?? 'Seed post',
                description: params.description ?? 'Seed description',
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

    describe('flagging posts', () => {
        it('should reject flagging post without token', async () => {
            const owner = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post(CREATE_FLAG_ROUTE)
                .send({ postId: post.id, reason: 'spam' })
                .expect(401);
        });

        it('should create post flag for authenticated user', async () => {
            const owner = await signUpUser();
            const reporter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const res = await request(app.getHttpServer())
                .post(CREATE_FLAG_ROUTE)
                .set('Authorization', `Bearer ${reporter.token}`)
                .send({
                    postId: post.id,
                    reason: 'spam',
                    description: 'Suspicious content',
                })
                .expect(201);

            expect(res.body).toBeDefined();

            const flagInDb = await prisma.flag.findFirst({
                where: {
                    reporterId: reporter.user.id,
                    postId: post.id,
                },
            });

            expect(flagInDb).toBeDefined();
            expect(flagInDb?.reporterId).toBe(reporter.user.id);
            expect(flagInDb?.postId).toBe(post.id);
        });

        it('should reject duplicate flag on same post from same user', async () => {
            const owner = await signUpUser();
            const reporter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post(CREATE_FLAG_ROUTE)
                .set('Authorization', `Bearer ${reporter.token}`)
                .send({ postId: post.id, reason: 'spam' })
                .expect(201);

            await request(app.getHttpServer())
                .post(CREATE_FLAG_ROUTE)
                .set('Authorization', `Bearer ${reporter.token}`)
                .send({ postId: post.id, reason: 'spam' })
                .expect(400);
        });
    });

    describe('listing flags', () => {
        it('should return flags list for moderation endpoint', async () => {
            const owner = await signUpUser();
            const reporter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await prisma.flag.create({
                data: {
                    reporterId: reporter.user.id,
                    postId: post.id,
                    reason: 'spam',
                    description: 'Seeded flag',
                },
            });

            const res = await request(app.getHttpServer())
                .get(FLAG_LIST_ROUTE)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].postId).toBe(post.id);
        });

        it('should return flags by post', async () => {
            const owner = await signUpUser();
            const reporter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await prisma.flag.create({
                data: {
                    reporterId: reporter.user.id,
                    postId: post.id,
                    reason: 'spam',
                    description: 'Seeded flag',
                },
            });

            const res = await request(app.getHttpServer())
                .get(FLAGS_BY_POST_ROUTE(post.id))
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].postId).toBe(post.id);
        });
    });
});
