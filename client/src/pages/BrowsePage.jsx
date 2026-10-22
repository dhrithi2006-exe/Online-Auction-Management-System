import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ImageWithFallback from '../components/ImageWithFallback';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state initialized from URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryid') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  // Load categories once
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  // Fetch auctions whenever filters change
  const fetchAuctions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (categoryId) params.set('categoryid', categoryId);
    if (condition) params.set('condition', condition);
    if (status) params.set('status', status);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sort) params.set('sort', sort);

    setSearchParams(params);

    fetch(`/api/auctions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.auctions) setAuctions(data.auctions);
      })
      .catch((err) => console.error('Failed to load auctions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAuctions();
  }, [categoryId, condition, status, sort]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAuctions();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setCondition('');
    setStatus('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setSearchParams(new URLSearchParams());
    setTimeout(() => {
      fetch('/api/auctions')
        .then((r) => r.json())
        .then((data) => setAuctions(data.auctions || []));
    }, 50);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '6px' }}>
          Browse Auctions
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Search and filter all items, bids, and active listings in the database.
        </p>
      </div>

      {/* Filter panel */}
      <div className="card" style={{ marginBottom: '28px', padding: '16px' }}>
        <form onSubmit={handleFilterSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              alignItems: 'end',
            }}
          >
            <div>
              <label className="form-label">Search Keywords</label>
              <input
                type="text"
                placeholder="Item title or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-select"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.categoryid} value={c.categoryid}>
                    {c.categoryname}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="form-select"
              >
                <option value="">Any Condition</option>
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="Refurbished">Refurbished</option>
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="form-label">Sort Order</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="form-select"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="enddate_asc">Ending Soonest</option>
                <option value="bids_desc">Most Bids</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Min $</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="form-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Max $</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '16px',
              borderTop: '1px solid var(--border)',
              paddingTop: '12px',
            }}
          >
            <button type="button" onClick={handleResetFilters} className="btn btn-secondary btn-sm">
              Reset Filters
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Showing <strong>{auctions.length}</strong> matching {auctions.length === 1 ? 'auction' : 'auctions'}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Retrieving auctions from database...
        </div>
      ) : auctions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No auctions found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            No database records match your active search filters. Try widening your price range or clearing selected categories.
          </p>
          <button onClick={handleResetFilters} className="btn btn-secondary btn-sm">
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="auction-grid">
          {auctions.map((auc) => (
            <div key={auc.auctionid} className="auction-card">
              <div className="auction-img-wrapper">
                <ImageWithFallback src={auc.imageurl} alt={auc.title} className="auction-img" />
                <span style={{ position: 'absolute', top: '8px', right: '8px' }}>
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

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Seller: <strong>{auc.seller_name}</strong>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Ends: <strong>{auc.enddate}</strong> &bull; {auc.total_bids} bids
                </div>

                <div className="auction-pricing">
                  <div>
                    <div className="price-label">
                      {auc.highest_bid ? 'Current Highest Bid' : 'Starting Price'}
                    </div>
                    <div className="price-amount">${parseFloat(auc.current_price).toFixed(2)}</div>
                  </div>

                  <Link to={`/auctions/${auc.auctionid}`} className="btn btn-primary btn-sm">
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
