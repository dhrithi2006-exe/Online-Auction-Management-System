import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageWithFallback from '../components/ImageWithFallback';

export default function AuctionDetailsPage() {
  const { id } = useParams();
  const { user, authFetch } = useAuth();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Watchlist state
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Bidding form state
  const [bidAmount, setBidAmount] = useState('');
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidFeedback, setBidFeedback] = useState({ type: null, message: null });

  const loadData = () => {
    Promise.all([
      fetch(`/api/auctions/${id}`).then((r) => {
        if (!r.ok) throw new Error('Auction not found');
        return r.json();
      }),
      fetch(`/api/auctions/${id}/bids`).then((r) => r.json()),
    ])
      .then(([aucData, bidData]) => {
        setAuction(aucData.auction);
        setBids(bidData.bids || []);

        // Compute suggested minimum bid
        const currentHighest = aucData.auction.highest_bid
          ? parseFloat(aucData.auction.highest_bid)
          : null;
        const startPrice = parseFloat(aucData.auction.startingprice);
        const minSuggested = currentHighest !== null ? currentHighest + 5 : startPrice;
        setBidAmount(minSuggested.toFixed(2));
      })
      .catch((err) => {
        console.error('Error loading auction details:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Check watchlist status when user or auction loads
  useEffect(() => {
    if (user && auction) {
      authFetch(`/api/watchlist/check/${auction.itemid}`)
        .then((r) => r.json())
        .then((data) => setIsWatchlisted(data.isWatchlisted))
        .catch(() => {});
    }
  }, [user, auction]);

  const handleToggleWatchlist = async () => {
    if (!user) {
      setBidFeedback({ type: 'error', message: 'Please sign in to manage your watchlist.' });
      return;
    }
    setWatchlistLoading(true);
    try {
      if (isWatchlisted) {
        await authFetch(`/api/watchlist/${auction.itemid}`, { method: 'DELETE' });
        setIsWatchlisted(false);
      } else {
        await authFetch(`/api/watchlist/${auction.itemid}`, { method: 'POST' });
        setIsWatchlisted(true);
      }
    } catch (err) {
      console.error('Watchlist update error:', err);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!user) {
      setBidFeedback({ type: 'error', message: 'You must be signed in to place a bid.' });
      return;
    }

    const amountNum = parseFloat(bidAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setBidFeedback({ type: 'error', message: 'Please enter a valid bid amount.' });
      return;
    }

    setBidSubmitting(true);
    setBidFeedback({ type: null, message: null });

    try {
      const res = await authFetch(`/api/auctions/${id}/bids`, {
        method: 'POST',
        body: JSON.stringify({ amount: amountNum }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit bid.');
      }

      setBidFeedback({
        type: 'success',
        message: `Your bid of $${amountNum.toFixed(2)} was successfully recorded!`,
      });

      // Reload auction & bid data
      loadData();
    } catch (err) {
      setBidFeedback({ type: 'error', message: err.message });
    } finally {
      setBidSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Retrieving auction details from database...
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Auction Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          The requested auction record does not exist or has been removed.
        </p>
        <Link to="/browse" className="btn btn-primary btn-sm">
          Return to Browse
        </Link>
      </div>
    );
  }

  const isSeller = user && Number(user.userid) === Number(auction.sellerid);
  const highestBidVal = auction.highest_bid ? parseFloat(auction.highest_bid) : null;
  const startingPriceVal = parseFloat(auction.startingprice);
  const minRequiredBid = highestBidVal !== null ? highestBidVal + 0.01 : startingPriceVal;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        <Link to="/">Home</Link> &gt; <Link to="/browse">Auctions</Link> &gt;{' '}
        <span style={{ color: 'var(--text-main)' }}>{auction.title}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)',
          gap: '32px',
          marginBottom: '40px',
        }}
      >
        {/* Left Column: Image & Item specs */}
        <div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-surface)',
              height: '380px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <ImageWithFallback
              src={auction.imageurl}
              alt={auction.title}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px' }}>
              Item Details & Condition
            </h3>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Category</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>
                    {auction.categoryname}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Condition</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>
                    {auction.itemcondition}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Seller</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>
                    {auction.seller_name}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Item ID</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace' }}>
                    #{auction.itemid}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>Item Status</td>
                  <td style={{ padding: '6px 0', textAlign: 'right' }}>
                    <span className={`badge badge-${auction.item_status.toLowerCase()}`}>
                      {auction.item_status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Bidding Details & Actions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className={`badge badge-${auction.auctionstatus.toLowerCase()}`}>
              Auction {auction.auctionstatus}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Auction #{auction.auctionid}
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              color: 'var(--text-main)',
              lineHeight: 1.25,
              marginBottom: '12px',
            }}
          >
            {auction.title}
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px' }}>
            {auction.description || 'No item description provided by seller.'}
          </p>

          {/* Pricing & Dates Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {highestBidVal ? 'Current Highest Bid' : 'Starting Price'}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>
                  ${(highestBidVal || startingPriceVal).toFixed(2)}
                </div>
                {highestBidVal && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Starting price was: ${startingPriceVal.toFixed(2)}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Auction Dates
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, marginTop: '4px' }}>
                  Started: <strong>{auction.startdate}</strong>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                  Ends: <strong>{auction.enddate}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Total bids: <strong>{bids.length}</strong>
                </div>
              </div>
            </div>

            {auction.winner_name && (
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: '12px',
                  fontSize: '0.88rem',
                  color: 'var(--text-main)',
                }}
              >
                Winner: <strong>{auction.winner_name}</strong>
              </div>
            )}
          </div>

          {/* Watchlist Button */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={handleToggleWatchlist}
              disabled={watchlistLoading}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              {isWatchlisted ? '★ Remove from My Watchlist' : '☆ Add to My Watchlist'}
            </button>
          </div>

          {/* Feedback message */}
          {bidFeedback.message && (
            <div className={`alert alert-${bidFeedback.type}`}>
              {bidFeedback.message}
            </div>
          )}

          {/* Place Bid Section */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '12px' }}>
              Place a Bid
            </h3>

            {!auction.isEligibleForBidding ? (
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', padding: '8px 0' }}>
                This auction is no longer active or the end date ({auction.enddate}) has passed. Bidding is closed.
              </div>
            ) : isSeller ? (
              <div style={{ fontSize: '0.88rem', color: 'var(--warning)', padding: '8px 0' }}>
                You listed this item. Sellers cannot place bids on their own items.
              </div>
            ) : !user ? (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  You must be logged in as a registered user to participate in bidding.
                </p>
                <Link to="/login" className="btn btn-primary btn-sm">
                  Sign In to Bid
                </Link>
              </div>
            ) : (
              <form onSubmit={handlePlaceBid}>
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label">
                    Your Bid Amount (USD) — Minimum: ${minRequiredBid.toFixed(2)}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '9px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min={minRequiredBid}
                        placeholder={minRequiredBid.toFixed(2)}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '24px' }}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={bidSubmitting}
                      className="btn btn-primary"
                      style={{ minWidth: '110px' }}
                    >
                      {bidSubmitting ? 'Submitting...' : 'Place Bid'}
                    </button>
                  </div>
                  <div className="form-help">
                    Bids are recorded securely with an exact timestamp in CockroachDB.
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bid History Table */}
      <section className="card" style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '10px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Bid History</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Complete record of all bids submitted for this auction
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {bids.length} {bids.length === 1 ? 'total bid' : 'total bids'}
          </span>
        </div>

        {bids.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No bids have been submitted yet. Be the first to bid at the starting price of ${startingPriceVal.toFixed(2)}!
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bid ID</th>
                  <th>Bidder</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b, idx) => (
                  <tr key={b.bidid}>
                    <td style={{ fontFamily: 'monospace' }}>#{b.bidid}</td>
                    <td>
                      <strong>{b.bidder_name}</strong>
                      {user && Number(user.userid) === Number(b.bidderid) && (
                        <span
                          style={{
                            marginLeft: '6px',
                            fontSize: '0.72rem',
                            color: 'var(--accent)',
                            fontWeight: 600,
                          }}
                        >
                          (You)
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: idx === 0 ? 'var(--accent)' : 'inherit' }}>
                      ${parseFloat(b.bidamount).toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(b.bidtime).toLocaleString()}
                    </td>
                    <td>
                      {idx === 0 ? (
                        <span className="badge badge-active">Highest Bid</span>
                      ) : (
                        <span className="badge badge-closed">Outbid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
