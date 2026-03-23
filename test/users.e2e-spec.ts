import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const PROFILE_ROUTE = (id: string) => `/users/${id}`;
    const REPUTATION_ROUTE = (id: string) => `/users/${id}/reputation`;
    const POSTS_ROUTE = (id: string) => `/users/${id}/posts`;
    const UPDATE_ROUTE = (id: string) => `/users/${id}`;

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
            payload,
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

    const seedPost = async (
        params: {
            authorId: string;
            categoryId: string;
            cityId: string;
        } & Partial<{
            title: string;
            description: string;
            latitude: number;
            longitude: number;
            imageUrl: string | null;
            images: string[];
            isActive: boolean;
            upvotes: number;
            downvotes: number;
            createdAt: Date;
        }>,
    ) => {
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
                ...params,
            },
        });
    };

    describe('GET /users/:id', () => {
        it('should return user profile publicly', async () => {
            const auth = await signUpUser();

            const res = await request(app.getHttpServer())
                .get(PROFILE_ROUTE(auth.user.id))
                .expect(200);

            expect(res.body).toBeDefined();
            expect(res.body.id).toBe(auth.user.id);
            expect(res.body.email).toBe(auth.payload.email);
            expect(res.body.firstName).toBe(auth.payload.firstName);
            expect(res.body.lastName).toBe(auth.payload.lastName);
            expect(res.body).not.toHaveProperty('password');
        });
    });

    describe('GET /users/:id/reputation', () => {
        it('should return user reputation', async () => {
            const auth = await signUpUser();

            const res = await request(app.getHttpServer())
                .get(REPUTATION_ROUTE(auth.user.id))
                .expect(200);

            expect(res.body).toBeDefined();
            expect(res.body.userId).toBe(auth.user.id);
            expect(res.body.score).toEqual(expect.any(Number));
            expect(res.body.totalPosts).toEqual(expect.any(Number));
            expect(res.body.totalUpvotes).toEqual(expect.any(Number));
            expect(res.body.totalDownvotes).toEqual(expect.any(Number));
            expect(res.body.dataAccuracy).toEqual(expect.any(Number));
        });
    });

    describe('GET /users/:id/posts', () => {
        it('should return only posts authored by selected user', async () => {
            const author = await signUpUser();
            const other = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const post1 = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Post autora 1',
            });

            const post2 = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Post autora 2',
            });

            const foreignPost = await seedPost({
                authorId: other.user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Obcy post',
            });

            const res = await request(app.getHttpServer())
                .get(`${POSTS_ROUTE(author.user.id)}?limit=50&skip=0`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);

            const ids = res.body.map((x: any) => x.id);
            expect(ids).toContain(post1.id);
            expect(ids).toContain(post2.id);
            expect(ids).not.toContain(foreignPost.id);
        });

        it('should respect limit and skip passed in query params', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const older = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Older post',
                createdAt: new Date('2026-01-01T10:00:00.000Z'),
            });

            await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Newer post',
                createdAt: new Date('2026-01-02T10:00:00.000Z'),
            });

            const res = await request(app.getHttpServer())
                .get(`${POSTS_ROUTE(author.user.id)}?limit=1&skip=1`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].id).toBe(older.id);
        });
    });

    describe('PUT /users/:id', () => {
        it('should reject update without token', async () => {
            const auth = await signUpUser();

            await request(app.getHttpServer())
                .put(UPDATE_ROUTE(auth.user.id))
                .send({ firstName: 'NoweImie' })
                .expect(401);
        });

        it('should reject updating another user profile', async () => {
            const owner = await signUpUser();
            const other = await signUpUser();

            await request(app.getHttpServer())
                .put(UPDATE_ROUTE(owner.user.id))
                .set('Authorization', `Bearer ${other.token}`)
                .send({ firstName: 'Hack' })
                .expect(403);
        });

        it('should update current user profile', async () => {
            const auth = await signUpUser();
            const city = await createCity();

            const res = await request(app.getHttpServer())
                .put(UPDATE_ROUTE(auth.user.id))
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    firstName: 'NoweImie',
                    lastName: 'NoweNazwisko',
                    bio: 'Nowe bio użytkownika',
                    selectedCityId: city.id,
                })
                .expect(200);

            expect(res.body.firstName).toBe('NoweImie');
            expect(res.body.lastName).toBe('NoweNazwisko');
            expect(res.body.bio).toBe('Nowe bio użytkownika');
            expect(res.body.selectedCityId).toBe(city.id);

            const userInDb = await prisma.user.findUnique({
                where: { id: auth.user.id },
            });

            expect(userInDb?.firstName).toBe('NoweImie');
            expect(userInDb?.lastName).toBe('NoweNazwisko');
            expect(userInDb?.bio).toBe('Nowe bio użytkownika');
            expect(userInDb?.selectedCityId).toBe(city.id);
        });

        it('should reject extra fields because whitelist is enabled', async () => {
            const auth = await signUpUser();

            await request(app.getHttpServer())
                .put(UPDATE_ROUTE(auth.user.id))
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    firstName: 'X',
                    role: 'admin',
                })
                .expect(400);
        });
    });
});