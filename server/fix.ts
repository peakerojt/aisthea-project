import { prisma } from './src/utils/prisma';

async function main() {
    try {
        console.log('Adding NameNormalized...');
        await prisma.$executeRawUnsafe(`
            IF COL_LENGTH('Products', 'NameNormalized') IS NULL
            BEGIN
                ALTER TABLE Products ADD NameNormalized AS dbo.fn_RemoveDiacritics(Name) PERSISTED;
                PRINT 'Added NameNormalized';
            END
        `);
        console.log('Adding DescriptionNormalized...');
        await prisma.$executeRawUnsafe(`
            IF COL_LENGTH('Products', 'DescriptionNormalized') IS NULL
            BEGIN
                ALTER TABLE Products ADD DescriptionNormalized AS dbo.fn_RemoveDiacritics(Description) PERSISTED;
                PRINT 'Added DescriptionNormalized';
            END
        `);
        console.log('Fix complete!');
    } catch (err) {
        console.error('Error fixing DB:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
