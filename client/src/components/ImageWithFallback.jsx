import React, { useState } from 'react';

const u = (url) => url.replace(/w=\d+/, 'w=800');

const fallbackImages = {
  electronics: u('https://images.unsplash.com/photo-1771189957050-76f13238f858?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  jewelry: u('https://images.unsplash.com/photo-1633934542430-0905ccb5f050?q=80&w=1025&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  fashion: u('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  books: u('https://images.unsplash.com/photo-1604866830893-c13cafa515d5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  collectibles: u('https://images.unsplash.com/photo-1777730039398-830cddd1cf15?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  sports: u('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  automotive: u('https://plus.unsplash.com/premium_photo-1682144905331-6d73d9d6ccc3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  kitchen: u('https://plus.unsplash.com/premium_photo-1678375722686-c7ea507c3003?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  beauty: u('https://plus.unsplash.com/premium_photo-1684407616442-8d5a1b7c978e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  furniture: u('https://images.unsplash.com/photo-1758565811033-84d1365000c6?q=80&w=727&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  art: u('https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=745&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
  default: u('https://plus.unsplash.com/premium_photo-1778385621840-87784497a6d5?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'),
};

const rules = [
  ['electronics', /\b(phone|laptop|camera|headphones?|earbuds?|electronics?|computer|tablet|gadget|speaker|console)\b/],
  ['jewelry', /\b(jewel(l?ery)?|rings?|necklace|bracelet|watch|wristwatch|diamond|gold|silver)\b/],
  ['fashion', /\b(clothes|clothing|fashion|dress|shirt|shoes?|bag|jacket|sneakers?|apparel|coat|jeans)\b/],
  ['books', /\b(books?|textbook|novel|manual|magazine)\b/],
  ['collectibles', /\b(lego|toys?|collectibles?|antique|vintage|figurine|memorabilia|coins?|stamps?|set)\b/],
  ['sports', /\b(bike|bicycle|cycle|sports?|fitness|tennis|cricket|skateboard)\b/],
  ['automotive', /\b(car|charger|battery|tyres?|tires?|engine|motorcycle|vehicle)\b/],
  ['kitchen', /\b(espresso|coffee|machine|blender|kettle|toaster|cookware|appliance)\b/],
  ['beauty', /\b(hair|dryer|shaver|trimmer|makeup|perfume)\b/],
  ['furniture', /\b(furniture|chair|table|sofa|desk|cabinet|bed|shelf)\b/],
  ['art', /\b(painting|art|sculpture|canvas|artwork)\b/],
];

function getFallbackImage(alt = '') {
  const text = alt.toLowerCase();
  const match = rules.find(([, re]) => re.test(text));
  return fallbackImages[match ? match[0] : 'default'];
}

export default function ImageWithFallback({ src, alt, className = '' }) {
  const [hasError, setHasError] = useState(false);
  const fallback = getFallbackImage(alt);

  if (!src || hasError) {
    return (
      <img
        src={fallback}
        alt={alt || 'Auction item'}
        className={className}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Auction item'}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}