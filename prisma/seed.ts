import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create categories
  const categories = [
    { name: 'Wypadek', slug: 'wypadek', color: '#EF4444', icon: '🚨' },
    {
      name: 'Niebezpieczeństwo',
      slug: 'niebezpieczenstwo',
      color: '#F97316',
      icon: '⚠️',
    },
    { name: 'Policja', slug: 'policja', color: '#3B82F6', icon: '🚔' },
    { name: 'Usterka', slug: 'usterka', color: '#8B5CF6', icon: '🔧' },
    { name: 'Wiadomość', slug: 'wiadomosc', color: '#06B6D4', icon: '📢' },
    { name: 'Zguba', slug: 'zguba', color: '#D946EF', icon: '🔍' },
    { name: 'Znaleziony', slug: 'znaleziony', color: '#10B981', icon: '✓' },
    { name: 'Mieszkańcy', slug: 'mieszkancy', color: '#F59E0B', icon: '👥' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  // Create Polish cities
  const cities = [
    {
      name: 'Warszawa',
      voivodeship: 'Mazowieckie',
      latitude: 52.2297,
      longitude: 21.0122,
    },
    {
      name: 'Kraków',
      voivodeship: 'Małopolskie',
      latitude: 50.0647,
      longitude: 19.945,
    },
    {
      name: 'Poznań',
      voivodeship: 'Wielkopolskie',
      latitude: 52.4064,
      longitude: 16.9252,
    },
    {
      name: 'Gdańsk',
      voivodeship: 'Pomorskie',
      latitude: 54.3766,
      longitude: 18.6466,
    },
    {
      name: 'Wrocław',
      voivodeship: 'Dolnośląskie',
      latitude: 51.1079,
      longitude: 17.0385,
    },
    {
      name: 'Łódź',
      voivodeship: 'Łódzkie',
      latitude: 51.7656,
      longitude: 19.4557,
    },
    {
      name: 'Szczecin',
      voivodeship: 'Zachodniopomorskie',
      latitude: 53.4285,
      longitude: 14.5528,
    },
    {
      name: 'Bydgoszcz',
      voivodeship: 'Kujawsko-Pomorskie',
      latitude: 53.1235,
      longitude: 18.0084,
    },
    {
      name: 'Katowice',
      voivodeship: 'Śląskie',
      latitude: 50.2647,
      longitude: 19.025,
    },
    {
      name: 'Białystok',
      voivodeship: 'Podlaskie',
      latitude: 53.1327,
      longitude: 23.1689,
    },
    {
      name: 'Kielce',
      voivodeship: 'Świętokrzyskie',
      latitude: 50.8654,
      longitude: 20.6289,
    },
    {
      name: 'Lublin',
      voivodeship: 'Lubelskie',
      latitude: 51.2465,
      longitude: 22.5684,
    },
    {
      name: 'Radom',
      voivodeship: 'Mazovian',
      latitude: 51.4026,
      longitude: 21.1475,
    },
    {
      name: 'Rzeszów',
      voivodeship: 'Podkarpackie',
      latitude: 50.0412,
      longitude: 21.9994,
    },
    {
      name: 'Toruń',
      voivodeship: 'Kujawsko-Pomorskie',
      latitude: 53.0245,
      longitude: 18.5976,
    },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: city,
      create: city,
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
