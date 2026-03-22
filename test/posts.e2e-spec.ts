import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PostsController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

    const createCategory = async (
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
                name: `Awarie-${n}`,
                slug: `awarie-${n}`,
                color: '#ff0000',
                icon: 'alert-circle',
                ...overrides,
            },
        });
    };

    const createCity = async (
        overrides?: Partial<{
            name: string;
            voivodeship: string;
            latitude: number;
            longitude: number;
        }>,
    ) => {
        const n = uid();
        return prisma.city.create({
            data: {
                name: `Miasto-${n}`,
                voivodeship: 'kujawsko-pomorskie',
                latitude: 53.1235,
                longitude: 18.0084,
                ...overrides,
            },
        });
    };

    const createPostPayload = (
        categoryId: string,
        cityId: string,
        overrides?: Partial<{
            title: string;
            description: string;
            latitude: number;
            longitude: number;
            imageUrl?: string;
            images?: string[];
        }>,
    ) => ({
        title: 'Uszkodzona latarnia',
        description: 'Latarnia nie działa od dwóch dni.',
        categoryId,
        cityId,
        latitude: 53.1235,
        longitude: 18.0084,
        imageUrl: 'https://example.com/image.jpg',
        images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
        ...overrides,
    });

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
                ...params,
            },
        });
    };

    describe('/posts (POST)', () => {
        it('should reject create post without token', async () => {
            const category = await createCategory();
            const city = await createCity();

            await request(app.getHttpServer())
                .post('/posts')
                .send(createPostPayload(category.id, city.id))
                .expect(401);
        });

        it('should create post for authenticated user', async () => {
            const { token, user } = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const res = await request(app.getHttpServer())
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send(createPostPayload(category.id, city.id))
                .expect(201);

            expect(res.body).toBeDefined();
            expect(res.body.id).toEqual(expect.any(String));
            expect(res.body.title).toBe('Uszkodzona latarnia');
            expect(res.body.description).toBe('Latarnia nie działa od dwóch dni.');
            expect(res.body.authorId).toBe(user.id);
            expect(res.body.cityId).toBe(city.id);
            expect(res.body.categoryId).toBe(category.id);
            expect(res.body.upvotes).toBe(0);
            expect(res.body.downvotes).toBe(0);
            expect(res.body.isActive).toBe(true);

            expect(res.body.author).toMatchObject({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            });

            expect(res.body.category).toMatchObject({
                id: category.id,
                name: category.name,
                slug: category.slug,
                color: category.color,
            });

            const postInDb = await prisma.post.findUnique({
                where: { id: res.body.id },
            });

            expect(postInDb).toBeDefined();
            expect(postInDb?.title).toBe('Uszkodzona latarnia');

            const reputation = await prisma.userReputation.findUnique({
                where: { userId: user.id },
            });

            expect(reputation).toBeDefined();
            expect(reputation?.totalPosts).toBe(1);
        });

        it('should reject invalid payload', async () => {
            const { token } = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            await request(app.getHttpServer())
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 123,
                    description: 'Opis',
                    categoryId: category.id,
                    cityId: city.id,
                    latitude: 'bad-value',
                    longitude: 18.0084,
                })
                .expect(400);
        });

        it('should reject extra fields because whitelist is enabled', async () => {
            const { token } = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            await request(app.getHttpServer())
                .post('/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    ...createPostPayload(category.id, city.id),
                    hack: true,
                })
                .expect(400);
        });
    });

    describe('/posts/:id (GET)', () => {
        it('should return post by id with author and category', async () => {
            const { user } = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const post = await seedPost({
                authorId: user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Post by id',
            });

            const res = await request(app.getHttpServer())
                .get(`/posts/${post.id}`)
                .expect(200);

            expect(res.body.id).toBe(post.id);
            expect(res.body.title).toBe('Post by id');
            expect(res.body.author.id).toBe(user.id);
            expect(res.body.category.id).toBe(category.id);
            expect(Array.isArray(res.body.comments)).toBe(true);
        });
    });

    describe('/posts/city/:cityId (GET)', () => {
        it('should return only active posts from selected city', async () => {
            const { user } = await signUpUser();
            const category = await createCategory();
            const city1 = await createCity({ name: `Bydgoszcz-${uid()}` });
            const city2 = await createCity({
                name: `Torun-${uid()}`,
                latitude: 53.0138,
                longitude: 18.5984,
            });

            await seedPost({
                authorId: user.id,
                categoryId: category.id,
                cityId: city1.id,
                title: 'Post 1',
                isActive: true,
            });

            await seedPost({
                authorId: user.id,
                categoryId: category.id,
                cityId: city2.id,
                title: 'Post 2',
                isActive: true,
            });

            await seedPost({
                authorId: user.id,
                categoryId: category.id,
                cityId: city1.id,
                title: 'Nieaktywny post',
                isActive: false,
            });

            const res = await request(app.getHttpServer())
                .get(`/posts/city/${city1.id}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].title).toBe('Post 1');
            expect(res.body[0].cityId).toBe(city1.id);
            expect(res.body[0].isActive).toBe(true);
        });
    });

    describe('/posts/nearby (GET)', () => {
        it('should return only nearby posts within radius', async () => {
            const { user } = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            await seedPost({
                authorId: user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Blisko',
                latitude: 53.1235,
                longitude: 18.0084,
                isActive: true,
            });

            await seedPost({
                authorId: user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Daleko',
                latitude: 52.2297,
                longitude: 21.0122,
                isActive: true,
            });

            const res = await request(app.getHttpServer())
                .get('/posts/nearby')
                .query({
                    latitude: 53.1235,
                    longitude: 18.0084,
                    radius: 3,
                    limit: 20,
                })
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].title).toBe('Blisko');
        });
    });

    describe('/posts/:id (PUT)', () => {
        it('should update own post', async () => {
            const owner = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
                title: 'Stary tytuł',
                description: 'Stary opis',
            });

            const res = await request(app.getHttpServer())
                .put(`/posts/${post.id}`)
                .set('Authorization', `Bearer ${owner.token}`)
                .send({
                    title: 'Zmieniony tytuł',
                    description: 'Zmieniony opis',
                })
                .expect(200);

            expect(res.body.id).toBe(post.id);
            expect(res.body.title).toBe('Zmieniony tytuł');
            expect(res.body.description).toBe('Zmieniony opis');

            const postInDb = await prisma.post.findUnique({
                where: { id: post.id },
            });

            expect(postInDb?.title).toBe('Zmieniony tytuł');
            expect(postInDb?.description).toBe('Zmieniony opis');
        });

        it('should reject updating someone else post', async () => {
            const user1 = await signUpUser();
            const user2 = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const post = await seedPost({
                authorId: user1.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .put(`/posts/${post.id}`)
                .set('Authorization', `Bearer ${user2.token}`)
                .send({
                    title: 'Próba przejęcia',
                })
                .expect(403);
        });
    });

    describe('/posts/:id (DELETE)', () => {
        it('should delete own post', async () => {
            const owner = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .delete(`/posts/${post.id}`)
                .set('Authorization', `Bearer ${owner.token}`)
                .expect(200);

            const postInDb = await prisma.post.findUnique({
                where: { id: post.id },
            });

            expect(postInDb).toBeNull();
        });

        it('should reject deleting someone else post', async () => {
            const user1 = await signUpUser();
            const user2 = await signUpUser();
            const category = await createCategory();
            const city = await createCity();

            const post = await seedPost({
                authorId: user1.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .delete(`/posts/${post.id}`)
                .set('Authorization', `Bearer ${user2.token}`)
                .expect(403);
        });
    });
});