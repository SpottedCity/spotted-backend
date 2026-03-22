import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const signupPayload = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
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
        await prisma.subscription.deleteMany();
        await prisma.flag.deleteMany();
        await prisma.vote.deleteMany();
        await prisma.comment.deleteMany();
        await prisma.post.deleteMany();
        await prisma.userReputation.deleteMany();
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Auth Endpoints', () => {
        describe('/auth/signup (POST)', () => {
            it('should register user and return token + safe user payload', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send(signupPayload)
                    .expect(201);

                expect(res.body).toBeDefined();
                expect(res.body.accessToken).toEqual(expect.any(String));
                expect(res.body.user).toBeDefined();

                expect(res.body.user).toMatchObject({
                    email: signupPayload.email,
                    firstName: signupPayload.firstName,
                    lastName: signupPayload.lastName,
                });

                expect(res.body.user.id).toEqual(expect.any(String));
                expect(res.body.user).not.toHaveProperty('password');
            });

            it('should save user in database', async () => {
                await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send(signupPayload)
                    .expect(201);

                const user = await prisma.user.findUnique({
                    where: { email: signupPayload.email },
                    include: { reputation: true },
                });

                expect(user).toBeDefined();
                expect(user?.email).toBe(signupPayload.email);
                expect(user?.firstName).toBe(signupPayload.firstName);
                expect(user?.lastName).toBe(signupPayload.lastName);

                // hasło nie powinno być zapisane plain-textem
                expect(user?.password).toBeDefined();
                expect(user?.password).not.toBe(signupPayload.password);

                // signup tworzy też reputację
                expect(user?.reputation).toBeDefined();
            });

            it('should reject duplicate email', async () => {
                await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send(signupPayload)
                    .expect(201);

                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send(signupPayload)
                    .expect(401);

                expect(res.body.message).toBeDefined();
            });

            it('should reject invalid email', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send({
                        ...signupPayload,
                        email: 'not-an-email',
                    })
                    .expect(400);

                expect(res.body.message).toBeDefined();
            });

            it('should reject too short password', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send({
                        ...signupPayload,
                        password: '123',
                    })
                    .expect(400);

                expect(res.body.message).toBeDefined();
            });

            it('should reject missing email', async () => {
                const { email, ...payloadWithoutEmail } = signupPayload;

                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send(payloadWithoutEmail)
                    .expect(400);

                expect(res.body.message).toBeDefined();
            });

            it('should reject missing password', async () => {
                const { password, ...payloadWithoutPassword } = signupPayload;

                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send(payloadWithoutPassword)
                    .expect(400);

                expect(res.body.message).toBeDefined();
            });

            it('should reject non-string firstName', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send({
                        ...signupPayload,
                        firstName: 12345,
                    })
                    .expect(400);

                expect(res.body.message).toBeDefined();
            });

            it('should reject extra fields because whitelist+forbidNonWhitelisted is enabled', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send({
                        ...signupPayload,
                        role: 'admin',
                    })
                    .expect(400);

                expect(res.body.message).toBeDefined();
            });

            it('should allow optional firstName and lastName to be omitted', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send({
                        email: 'minimal@example.com',
                        password: 'password123',
                    })
                    .expect(201);

                expect(res.body.accessToken).toEqual(expect.any(String));
                expect(res.body.user.email).toBe('minimal@example.com');
            });
        });

        describe('/auth/signin (POST)', () => {
            beforeEach(async () => {
                await request(app.getHttpServer())
                    .post('/auth/signup')
                    .send(signupPayload)
                    .expect(201);
            });

            it('should sign in registered user', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signin')
                    .send({
                        email: signupPayload.email,
                        password: signupPayload.password,
                    })
                    .expect(200);

                expect(res.body.accessToken).toEqual(expect.any(String));
                expect(res.body.user.email).toBe(signupPayload.email);
            });

            it('should reject wrong password', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signin')
                    .send({
                        email: signupPayload.email,
                        password: 'wrongpassword',
                    })
                    .expect(401);

                expect(res.body.message).toBeDefined();
            });

            it('should reject non-existing user', async () => {
                const res = await request(app.getHttpServer())
                    .post('/auth/signin')
                    .send({
                        email: 'missing@example.com',
                        password: 'password123',
                    })
                    .expect(401);

                expect(res.body.message).toBeDefined();
            });
        });
    });

    it('/ (GET)', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect('Hello World!');
    });
});