import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('VotesController (e2e)', () => {
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
            upvotes: number;
            downvotes: number;
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

    const seedComment = async (
        params: {
            authorId: string;
            postId: string;
            content: string;
        } & Partial<{
            parentId: string | null;
            upvotes: number;
            downvotes: number;
        }>,
    ) => {
        return prisma.comment.create({
            data: {
                parentId: null,
                upvotes: 0,
                downvotes: 0,
                ...params,
            },
        });
    };

    describe('/votes/post/:postId (POST)', () => {
        it('should reject post vote without token', async () => {
            const owner = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post(`/votes/post/${post.id}`)
                .send({ value: 1 })
                .expect(401);
        });

        it('should reject invalid vote value on post', async () => {
            const owner = await signUpUser();
            const voter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post(`/votes/post/${post.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: 2 })
                .expect(400);

            const postInDb = await prisma.post.findUnique({
                where: { id: post.id },
            });

            expect(postInDb?.upvotes).toBe(0);
            expect(postInDb?.downvotes).toBe(0);
        });

        it('should create upvote on post', async () => {
            const owner = await signUpUser();
            const voter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            const res = await request(app.getHttpServer())
                .post(`/votes/post/${post.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: 1 })
                .expect(201);

            expect(res.body.upvotes).toBe(1);
            expect(res.body.downvotes).toBe(0);

            const voteInDb = await prisma.vote.findFirst({
                where: {
                    userId: voter.user.id,
                    postId: post.id,
                    commentId: null,
                },
            });

            expect(voteInDb).toBeDefined();
            expect(voteInDb?.value).toBe(1);

            const postInDb = await prisma.post.findUnique({
                where: { id: post.id },
            });

            expect(postInDb?.upvotes).toBe(1);
            expect(postInDb?.downvotes).toBe(0);
        });

        it('should remove post vote when same value is sent again', async () => {
            const owner = await signUpUser();
            const voter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post(`/votes/post/${post.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: 1 })
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/votes/post/${post.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: 1 })
                .expect(201);

            expect(res.body.upvotes).toBe(0);
            expect(res.body.downvotes).toBe(0);

            const voteInDb = await prisma.vote.findFirst({
                where: {
                    userId: voter.user.id,
                    postId: post.id,
                    commentId: null,
                },
            });

            expect(voteInDb).toBeNull();

            const postInDb = await prisma.post.findUnique({
                where: { id: post.id },
            });

            expect(postInDb?.upvotes).toBe(0);
            expect(postInDb?.downvotes).toBe(0);
        });

        it('should switch post vote from upvote to downvote', async () => {
            const owner = await signUpUser();
            const voter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });

            await request(app.getHttpServer())
                .post(`/votes/post/${post.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: 1 })
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/votes/post/${post.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: -1 })
                .expect(201);

            expect(res.body.upvotes).toBe(0);
            expect(res.body.downvotes).toBe(1);

            const voteInDb = await prisma.vote.findFirst({
                where: {
                    userId: voter.user.id,
                    postId: post.id,
                    commentId: null,
                },
            });

            expect(voteInDb).toBeDefined();
            expect(voteInDb?.value).toBe(-1);

            const postInDb = await prisma.post.findUnique({
                where: { id: post.id },
            });

            expect(postInDb?.upvotes).toBe(0);
            expect(postInDb?.downvotes).toBe(1);
        });
    });

    describe('/votes/comment/:commentId (POST)', () => {
        it('should reject comment vote without token', async () => {
            const owner = await signUpUser();
            const commenter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });
            const comment = await seedComment({
                authorId: commenter.user.id,
                postId: post.id,
                content: 'Komentarz',
            });

            await request(app.getHttpServer())
                .post(`/votes/comment/${comment.id}`)
                .send({ value: 1 })
                .expect(401);
        });

        it('should create downvote on comment', async () => {
            const owner = await signUpUser();
            const commenter = await signUpUser();
            const voter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });
            const comment = await seedComment({
                authorId: commenter.user.id,
                postId: post.id,
                content: 'Komentarz',
            });

            const res = await request(app.getHttpServer())
                .post(`/votes/comment/${comment.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: -1 })
                .expect(201);

            expect(res.body.upvotes).toBe(0);
            expect(res.body.downvotes).toBe(1);

            const voteInDb = await prisma.vote.findFirst({
                where: {
                    userId: voter.user.id,
                    postId: null,
                    commentId: comment.id,
                },
            });

            expect(voteInDb).toBeDefined();
            expect(voteInDb?.value).toBe(-1);

            const commentInDb = await prisma.comment.findUnique({
                where: { id: comment.id },
            });

            expect(commentInDb?.upvotes).toBe(0);
            expect(commentInDb?.downvotes).toBe(1);
        });

        it('should switch comment vote from downvote to upvote', async () => {
            const owner = await signUpUser();
            const commenter = await signUpUser();
            const voter = await signUpUser();
            const category = await createCategory();
            const city = await createCity();
            const post = await seedPost({
                authorId: owner.user.id,
                categoryId: category.id,
                cityId: city.id,
            });
            const comment = await seedComment({
                authorId: commenter.user.id,
                postId: post.id,
                content: 'Komentarz',
            });

            await request(app.getHttpServer())
                .post(`/votes/comment/${comment.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: -1 })
                .expect(201);

            const res = await request(app.getHttpServer())
                .post(`/votes/comment/${comment.id}`)
                .set('Authorization', `Bearer ${voter.token}`)
                .send({ value: 1 })
                .expect(201);

            expect(res.body.upvotes).toBe(1);
            expect(res.body.downvotes).toBe(0);

            const voteInDb = await prisma.vote.findFirst({
                where: {
                    userId: voter.user.id,
                    postId: null,
                    commentId: comment.id,
                },
            });

            expect(voteInDb).toBeDefined();
            expect(voteInDb?.value).toBe(1);

            const commentInDb = await prisma.comment.findUnique({
                where: { id: comment.id },
            });

            expect(commentInDb?.upvotes).toBe(1);
            expect(commentInDb?.downvotes).toBe(0);
        });
    });
});