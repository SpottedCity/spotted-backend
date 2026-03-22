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

    describe('PUT /users/:id', () => {
        it('should reject update without token', async () => {
            const auth = await signUpUser();

            await request(app.getHttpServer())
                .put(UPDATE_ROUTE(auth.user.id))
                .send({ firstName: 'NoweImie' })
                .expect(401);
        });

        it('should update current user profile', async () => {
            const auth = await signUpUser();

            const res = await request(app.getHttpServer())
                .put(UPDATE_ROUTE(auth.user.id))
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    firstName: 'NoweImie',
                    lastName: 'NoweNazwisko',
                })
                .expect(200);

            expect(res.body.firstName).toBe('NoweImie');
            expect(res.body.lastName).toBe('NoweNazwisko');

            const userInDb = await prisma.user.findUnique({
                where: { id: auth.user.id },
            });

            expect(userInDb?.firstName).toBe('NoweImie');
            expect(userInDb?.lastName).toBe('NoweNazwisko');
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
