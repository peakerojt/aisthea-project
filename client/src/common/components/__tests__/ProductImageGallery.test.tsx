import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProductImageGallery } from '@/common/components/ProductImageGallery';

describe('ProductImageGallery', () => {
  it('uses the original imageUrl for the main image and lightbox while keeping thumbnailUrl for previews', async () => {
    render(
      <ProductImageGallery
        productName="Classic Polo"
        images={[
          {
            imageId: 1,
            imageUrl: 'https://cdn.example.com/products/polo-original-front.png',
            thumbnailUrl: 'https://cdn.example.com/products/polo-thumb-front.webp',
          },
          {
            imageId: 2,
            imageUrl: 'https://cdn.example.com/products/polo-original-back.png',
            thumbnailUrl: 'https://cdn.example.com/products/polo-thumb-back.webp',
          },
        ]}
      />,
    );

    const mainImage = screen.getByAltText('Classic Polo - Image 1');
    expect(mainImage).toHaveAttribute('src', 'https://cdn.example.com/products/polo-original-front.png');

    const thumbnailImage = screen.getByAltText('Classic Polo thumbnail 1');
    expect(thumbnailImage).toHaveAttribute('src', 'https://cdn.example.com/products/polo-thumb-front.webp');

    await userEvent.click(mainImage);

    const zoomedImage = await screen.findByAltText('Classic Polo - Zoomed');
    expect(zoomedImage).toHaveAttribute('src', 'https://cdn.example.com/products/polo-original-front.png');
  });

  it('keeps the page gallery image unchanged when navigating inside the lightbox', async () => {
    const user = userEvent.setup();

    render(
      <ProductImageGallery
        productName="Classic Hoodie"
        images={[
          {
            imageId: 1,
            imageUrl: 'https://cdn.example.com/products/hoodie-original-front.png',
            thumbnailUrl: 'https://cdn.example.com/products/hoodie-thumb-front.webp',
          },
          {
            imageId: 2,
            imageUrl: 'https://cdn.example.com/products/hoodie-original-back.png',
            thumbnailUrl: 'https://cdn.example.com/products/hoodie-thumb-back.webp',
          },
        ]}
      />,
    );

    await user.click(screen.getByAltText('Classic Hoodie thumbnail 2'));

    const galleryImage = screen.getByAltText('Classic Hoodie - Image 2');
    expect(galleryImage).toHaveAttribute('src', 'https://cdn.example.com/products/hoodie-original-back.png');

    await user.click(galleryImage);

    const zoomedImage = await screen.findByAltText('Classic Hoodie - Zoomed');
    expect(zoomedImage).toHaveAttribute('src', 'https://cdn.example.com/products/hoodie-original-back.png');

    await user.click(screen.getByRole('button', { name: 'Next lightbox image' }));

    expect(await screen.findByAltText('Classic Hoodie - Zoomed')).toHaveAttribute(
      'src',
      'https://cdn.example.com/products/hoodie-original-front.png',
    );
    expect(screen.getByAltText('Classic Hoodie - Image 2')).toHaveAttribute(
      'src',
      'https://cdn.example.com/products/hoodie-original-back.png',
    );
    expect(screen.getByTestId('lightbox-image-counter')).toHaveTextContent('1/2');
  });

  it('resets the gallery and closes the lightbox when the image set changes', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ProductImageGallery
        productName="Classic Tee"
        images={[
          {
            imageId: 1,
            imageUrl: 'https://cdn.example.com/products/tee-original-front.png',
            thumbnailUrl: 'https://cdn.example.com/products/tee-thumb-front.webp',
          },
          {
            imageId: 2,
            imageUrl: 'https://cdn.example.com/products/tee-original-back.png',
            thumbnailUrl: 'https://cdn.example.com/products/tee-thumb-back.webp',
          },
        ]}
      />,
    );

    await user.click(screen.getByAltText('Classic Tee thumbnail 2'));
    await user.click(screen.getByAltText('Classic Tee - Image 2'));
    expect(await screen.findByAltText('Classic Tee - Zoomed')).toBeInTheDocument();

    rerender(
      <ProductImageGallery
        productName="Classic Tee"
        images={[
          {
            imageId: 3,
            imageUrl: 'https://cdn.example.com/products/tee-navy-front.png',
            thumbnailUrl: 'https://cdn.example.com/products/tee-navy-front-thumb.webp',
          },
          {
            imageId: 4,
            imageUrl: 'https://cdn.example.com/products/tee-navy-back.png',
            thumbnailUrl: 'https://cdn.example.com/products/tee-navy-back-thumb.webp',
          },
        ]}
      />,
    );

    expect(screen.queryByAltText('Classic Tee - Zoomed')).not.toBeInTheDocument();
    expect(screen.getByAltText('Classic Tee - Image 1')).toHaveAttribute(
      'src',
      'https://cdn.example.com/products/tee-navy-front.png',
    );
  });
});
