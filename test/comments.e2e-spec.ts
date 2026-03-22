import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CommentsController (e2e)', () => {
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

    const seedComment = async (
        params: {
            authorId: string;
            postId: string;
            content: string;
        } & Partial<{
            parentId: string | null;
        }>,
    ) => {
        return prisma.comment.create({
            data: {
                parentId: null,
                ...params,
            },
        });
    };

    describe('/comments (POST)', () => {
        it('should reject create comment without token', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post('/comments')
                .send({
                    content: 'Test comment',
                    postId: post.id,
                })
                .expect(401);
        });

        it('should create top-level comment for authenticated user', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const res = await request(app.getHttpServer())
                .post('/comments')
                .set('Authorization', `Bearer ${author.token}`)
                .send({
                    content: 'Pierwszy komentarz',
                    postId: post.id,
                })
                .expect(201);

            expect(res.body).toBeDefined();
            expect(res.body.id).toEqual(expect.any(String));
            expect(res.body.content).toBe('Pierwszy komentarz');
            expect(res.body.postId).toBe(post.id);
            expect(res.body.authorId).toBe(author.user.id);
            expect(res.body.parentId).toBeNull();
            expect(res.body.upvotes).toBe(0);
            expect(res.body.downvotes).toBe(0);

            expect(res.body.author).toMatchObject({
                id: author.user.id,
                firstName: author.user.firstName,
                lastName: author.user.lastName,
            });

            const commentInDb = await prisma.comment.findUnique({
                where: { id: res.body.id },
            });

            expect(commentInDb).toBeDefined();
            expect(commentInDb?.content).toBe('Pierwszy komentarz');
            expect(commentInDb?.postId).toBe(post.id);
            expect(commentInDb?.authorId).toBe(author.user.id);
        });

        it('should create reply comment', async () => {
            const author = await signUpUser();
            const replier = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const parent = await seedComment({
                authorId: author.user.id,
                postId: post.id,
                content: 'Komentarz główny',
            });

            const res = await request(app.getHttpServer())
                .post('/comments')
                .set('Authorization', `Bearer ${replier.token}`)
                .send({
                    content: 'To jest odpowiedź',
                    postId: post.id,
                    parentId: parent.id,
                })
                .expect(201);

            expect(res.body.id).toEqual(expect.any(String));
            expect(res.body.content).toBe('To jest odpowiedź');
            expect(res.body.postId).toBe(post.id);
            expect(res.body.parentId).toBe(parent.id);
            expect(res.body.authorId).toBe(replier.user.id);

            const replyInDb = await prisma.comment.findUnique({
                where: { id: res.body.id },
            });

            expect(replyInDb).toBeDefined();
            expect(replyInDb?.parentId).toBe(parent.id);
        });

        it('should reject invalid payload', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post('/comments')
                .set('Authorization', `Bearer ${author.token}`)
                .send({
                    content: 123,
                    postId: post.id,
                })
                .expect(400);
        });

        it('should reject missing postId', async () => {
            const author = await signUpUser();

            await request(app.getHttpServer())
                .post('/comments')
                .set('Authorization', `Bearer ${author.token}`)
                .send({
                    content: 'Brak postId',
                })
                .expect(400);
        });

        it('should reject extra fields because whitelist is enabled', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post('/comments')
                .set('Authorization', `Bearer ${author.token}`)
                .send({
                    content: 'Komentarz',
                    postId: post.id,
                    hack: true,
                })
                .expect(400);
        });
    });

    describe('/comments/post/:postId (GET)', () => {
        it('should return only top-level comments with nested replies', async () => {
            const user1 = await signUpUser();
            const user2 = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: user1.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const topLevel = await seedComment({
                authorId: user1.user.id,
                postId: post.id,
                content: 'Komentarz główny',
            });

            await seedComment({
                authorId: user2.user.id,
                postId: post.id,
                parentId: topLevel.id,
                content: 'Odpowiedź 1',
            });

            const res = await request(app.getHttpServer())
                .get(`/comments/post/${post.id}`)
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);

            expect(res.body[0].id).toBe(topLevel.id);
            expect(res.body[0].content).toBe('Komentarz główny');
            expect(res.body[0].parentId).toBeNull();
            expect(res.body[0].author.id).toBe(user1.user.id);

            expect(Array.isArray(res.body[0].replies)).toBe(true);
            expect(res.body[0].replies.length).toBe(1);
            expect(res.body[0].replies[0].content).toBe('Odpowiedź 1');
            expect(res.body[0].replies[0].parentId).toBe(topLevel.id);
            expect(res.body[0].replies[0].author.id).toBe(user2.user.id);
        });

        it('should respect limit and skip for top-level comments', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await seedComment({
                authorId: author.user.id,
                postId: post.id,
                content: 'Komentarz 1',
            });

            await seedComment({
                authorId: author.user.id,
                postId: post.id,
                content: 'Komentarz 2',
            });

            const res = await request(app.getHttpServer())
                .get(`/comments/post/${post.id}`)
                .query({
                    limit: 1,
                    skip: 0,
                })
                .expect(200);

            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
        });
    });

    describe('/comments/:id (PUT)', () => {
        it('should update own comment', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const comment = await seedComment({
                authorId: author.user.id,
                postId: post.id,
                content: 'Stara treść',
            });

            const res = await request(app.getHttpServer())
                .put(`/comments/${comment.id}`)
                .set('Authorization', `Bearer ${author.token}`)
                .send({
                    content: 'Nowa treść',
                })
                .expect(200);

            expect(res.body.id).toBe(comment.id);
            expect(res.body.content).toBe('Nowa treść');

            const commentInDb = await prisma.comment.findUnique({
                where: { id: comment.id },
            });

            expect(commentInDb?.content).toBe('Nowa treść');
        });

        it('should reject updating someone else comment', async () => {
            const owner = await signUpUser();
            const intruder = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const comment = await seedComment({
                authorId: owner.user.id,
                postId: post.id,
                content: 'Nie ruszaj mnie',
            });

            await request(app.getHttpServer())
                .put(`/comments/${comment.id}`)
                .set('Authorization', `Bearer ${intruder.token}`)
                .send({
                    content: 'Próba przejęcia',
                })
                .expect(403);
        });
    });

    describe('/comments/:id (DELETE)', () => {
        it('should delete own comment', async () => {
            const author = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: author.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const comment = await seedComment({
                authorId: author.user.id,
                postId: post.id,
                content: 'Usuń mnie',
            });

            await request(app.getHttpServer())
                .delete(`/comments/${comment.id}`)
                .set('Authorization', `Bearer ${author.token}`)
                .expect(200);

            const commentInDb = await prisma.comment.findUnique({
                where: { id: comment.id },
            });

            expect(commentInDb).toBeNull();
        });

        it('should reject deleting someone else comment', async () => {
            const owner = await signUpUser();
            const intruder = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const comment = await seedComment({
                authorId: owner.user.id,
                postId: post.id,
                content: 'Nie usuwaj mnie',
            });

            await request(app.getHttpServer())
                .delete(`/comments/${comment.id}`)
                .set('Authorization', `Bearer ${intruder.token}`)
                .expect(403);
        });
    });
});