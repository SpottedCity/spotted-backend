import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UploadsController (e2e)', () => {
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
        };
    };

    describe('POST /uploads/image', () => {
        it('should reject upload without token', async () => {
            await request(app.getHttpServer())
                .post('/uploads/image')
                .attach('file', Buffer.from('fake-image-content'), 'test-image.png')
                .expect(401);
        });

        it('should upload single image for authenticated user', async () => {
            const auth = await signUpUser();

            const res = await request(app.getHttpServer())
                .post('/uploads/image')
                .set('Authorization', `Bearer ${auth.token}`)
                .attach('file', Buffer.from('fake-image-content'), 'test-image.png')
                .expect(201);

            expect(res.body).toBeDefined();
            expect(res.body.url).toEqual(expect.any(String));
            expect(res.body.url).toContain(`/posts/${auth.user.id}/`);
            expect(res.body.url).toContain('test-image.png');
        });
    });

    describe('POST /uploads/images', () => {
        it('should upload multiple images for authenticated user', async () => {
            const auth = await signUpUser();

            const res = await request(app.getHttpServer())
                .post('/uploads/images')
                .set('Authorization', `Bearer ${auth.token}`)
                .attach('files', Buffer.from('fake-image-a'), 'a.png')
                .attach('files', Buffer.from('fake-image-b'), 'b.png')
                .expect(201);

            expect(Array.isArray(res.body.urls)).toBe(true);
            expect(res.body.urls.length).toBe(2);

            expect(res.body.urls[0]).toContain(`/posts/${auth.user.id}/`);
            expect(res.body.urls[0]).toContain('a.png');

            expect(res.body.urls[1]).toContain(`/posts/${auth.user.id}/`);
            expect(res.body.urls[1]).toContain('b.png');
        });
    });

    describe('POST /uploads/avatar', () => {
        it('should upload avatar for authenticated user', async () => {
            const auth = await signUpUser();

            const res = await request(app.getHttpServer())
                .post('/uploads/avatar')
                .set('Authorization', `Bearer ${auth.token}`)
                .attach('file', Buffer.from('fake-avatar-content'), 'avatar.jpg')
                .expect(201);

            expect(res.body).toBeDefined();
            expect(res.body.url).toEqual(expect.any(String));
            expect(res.body.url).toContain(`/avatars/${auth.user.id}/`);
            expect(res.body.url).toContain('avatar.jpg');
        });
    });
});