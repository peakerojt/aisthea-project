import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'steetwear', mode: 'insensitive' } } // typo in db?
  }) || await prisma.product.findFirst({
    where: { name: { contains: 'streetwear', mode: 'insensitive' } }
  });

  if (!product) {
    console.log('Product not found');
    return;
  }

  const images = await prisma.productImage.findMany({
    where: { productId: product.productId },
    select: { imageId: true, imageUrl: true, variantId: true }
  });

  console.log('Images for product:', product.name);
  console.log(JSON.stringify(images, null, 2));

  const variants = await prisma.productVariant.findMany({
    where: { productId: product.productId },
    include: {
      variantAttributes: {
        include: { attribute: true, value: true }
      }
    }
  });
  console.log('Variants:');
  console.log(JSON.stringify(variants, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
