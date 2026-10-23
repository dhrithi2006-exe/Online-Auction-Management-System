import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ImageWithFallback from '../components/ImageWithFallback';
import { formatINR } from '../utils/formatINR';

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featuredAuctions, setFeaturedAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/auctions?limit=8&status=Active').then((r) => r.json()),
    ])
      .then(([catData, aucData]) => {
        if (catData.categories) setCategories(catData.categories);
        if (aucData.auctions) setFeaturedAuctions(aucData.auctions);
      })
      .catch((err) => console.error('Failed to load homepage data:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCategory) params.set('categoryid', selectedCategory);
    navigate(`/browse?${params.toString()}`);
  };

  return (
    <div>
      {/* Intro banner */}
      <section
        style={{
          borderBottom: '1px solid var(--border)',
          paddingBottom: '28px',
          marginBottom: '32px',
        }}
      >
        <div style={{ maxWidth: '800px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.4rem',
              color: 'var(--text-main)',
              lineHeight: 1.2,
              marginBottom: '10px',
            }}
          >
            Transparent, community-driven online auctions.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '24px' }}>
            Bid on authentic items listed by verified campus and local sellers. Complete with verifiable bid history, transparent payments, and end-to-end order tracking.
          </p>

          {/* Search & Filter Form */}
          <form
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              backgroundColor: 'var(--bg-surface)',
              padding: '12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <input
              type="text"
              placeholder="Search items by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ flex: '2', minWidth: '220px' }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select"
              style={{ flex: '1', minWidth: '160px' }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.categoryid} value={c.categoryid}>
                  {c.categoryname}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
              Search Auctions
            </button>
          </form>
        </div>
      </section>

      {/* Categories quick chips */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Explore by Category</h2>
          <Link to="/browse" style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 500 }}>
            View all &rarr;
          </Link>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {categories.slice(0, 10).map((cat) => (
            <Link
              key={cat.categoryid}
              to={`/browse?categoryid=${cat.categoryid}`}
              style={{
                fontSize: '0.85rem',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-main)',
              }}
            >
              {cat.categoryname}
            </Link>
          ))}
        </div>
      </section>

      {/* Active Auctions Section */}
      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '8px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Currently Active Auctions</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time listings stored in CockroachDB
            </p>
          </div>
          <Link to="/browse?status=Active" className="btn btn-secondary btn-sm">
            View All ({featuredAuctions.length})
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Retrieving auctions from database...
          </div>
        ) : featuredAuctions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No active auctions found at the moment.</p>
          </div>
        ) : (
          <div className="auction-grid">
            {featuredAuctions.map((auc) => (
              <div key={auc.auctionid} className="auction-card">
                <div className="auction-img-wrapper">
                  <ImageWithFallback src={auc.imageurl} alt={auc.title} className="auction-img" />
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                    }}
                  >
                    <span className={`badge badge-${auc.auctionstatus.toLowerCase()}`}>
                      {auc.auctionstatus}
                    </span>
                  </span>
                </div>

                <div className="auction-body">
                  <div className="auction-meta">
                    <span>{auc.categoryname}</span>
                    <span>&bull;</span>
                    <span>{auc.itemcondition}</span>
                  </div>

                  <h3 className="auction-title">
                    <Link to={`/auctions/${auc.auctionid}`}>{auc.title}</Link>
                  </h3>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Seller: <strong>{auc.seller_name}</strong>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Ends on: <strong>{auc.enddate}</strong> ({auc.total_bids} {auc.total_bids === 1 ? 'bid' : 'bids'})
                  </div>

                  <div className="auction-pricing">
                    <div>
                      <div className="price-label">
                        {auc.highest_bid ? 'Current Highest Bid' : 'Starting Price'}
                      </div>
                      <div className="price-amount">{formatINR(auc.current_price)}</div>
                    </div>

                    <Link to={`/auctions/${auc.auctionid}`} className="btn btn-primary btn-sm">
                      View Auction
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
