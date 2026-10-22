import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageWithFallback from '../components/ImageWithFallback';

export default function BuyerDashboard() {
  const { user, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('bids');

  const [bids, setBids] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [payments, setPayments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulated Payment Modal state
  const [paymentModalAuction, setPaymentModalAuction] = useState(null);
  const [payMethod, setPayMethod] = useState('UPI');
  const [payAddress, setPayAddress] = useState(user?.address || 'Campus Dormitory');
  const [courier, setCourier] = useState('BlueDart');
  const [payLoading, setPayLoading] = useState(false);
  const [payFeedback, setPayFeedback] = useState(null);

  // Review submission state
  const [reviewModalAuction, setReviewModalAuction] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);

  const loadBuyerData = () => {
    setLoading(true);
    Promise.all([
      authFetch('/api/bids/my-bids').then((r) => r.json()),
      authFetch('/api/watchlist').then((r) => r.json()),
      authFetch('/api/payments').then((r) => r.json()),
      authFetch('/api/shipping').then((r) => r.json()),
    ])
      .then(([bidData, watchData, payData, shipData]) => {
        if (bidData.bids) setBids(bidData.bids);
        if (watchData.watchlist) setWatchlist(watchData.watchlist);
        if (payData.payments) setPayments(payData.payments);
        if (shipData.shipments) setShipments(shipData.shipments);
      })
      .catch((err) => console.error('Buyer data error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBuyerData();
  }, []);

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    setPayFeedback(null);
    try {
      const res = await authFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          auctionid: paymentModalAuction.auctionid,
          paymentmethod: payMethod,
          shippingaddress: payAddress,
          courier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed.');

      setPayFeedback({ type: 'success', message: 'Simulated payment completed! Shipping record created.' });
      setPaymentModalAuction(null);
      loadBuyerData();
    } catch (err) {
      setPayFeedback({ type: 'error', message: err.message });
    } finally {
      setPayLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewFeedback(null);
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          auctionid: reviewModalAuction.auctionid,
          revieweeid: reviewModalAuction.sellerid,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed.');

      setReviewFeedback({ type: 'success', message: 'Review successfully recorded in database.' });
      setReviewModalAuction(null);
      setReviewComment('');
    } catch (err) {
      setReviewFeedback({ type: 'error', message: err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  // Find won auctions where current user is winneruserid
  const wonAuctions = bids.filter((b) => Number(b.winneruserid) === Number(user?.userid));
  // Unique by auctionid
  const uniqueWonAuctions = Array.from(new Map(wonAuctions.map((item) => [item.auctionid, item])).values());

  return (
    <div>
      {/* Header Profile card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem' }}>{user?.name}</h1>
              <span className="role-tag">{user?.role}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              User ID: <span style={{ fontFamily: 'monospace' }}>#{user?.userid}</span> &bull; {user?.email} &bull; Member since {user?.registrationdate}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '8px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{bids.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Bids</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{watchlist.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Watchlist</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{payments.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payments</div>
            </div>
          </div>
        </div>
      </div>

      {payFeedback && <div className={`alert alert-${payFeedback.type}`}>{payFeedback.message}</div>}
      {reviewFeedback && <div className={`alert alert-${reviewFeedback.type}`}>{reviewFeedback.message}</div>}

      {/* Tabs navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {[
          { id: 'bids', label: `My Bids (${bids.length})` },
          { id: 'won', label: `Won Auctions (${uniqueWonAuctions.length})` },
          { id: 'watchlist', label: `Watchlist (${watchlist.length})` },
          { id: 'payments', label: `Payment History (${payments.length})` },
          { id: 'shipping', label: `Shipping & Tracking (${shipments.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: My Bids */}
      {activeTab === 'bids' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>My Bidding Activity</h2>
          {bids.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              You have not placed any bids yet.{' '}
              <Link to="/browse" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                Explore active auctions
              </Link>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bid ID</th>
                    <th>Auction Item</th>
                    <th>My Bid Amount</th>
                    <th>Current Highest</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => (
                    <tr key={b.bidid}>
                      <td style={{ fontFamily: 'monospace' }}>#{b.bidid}</td>
                      <td>
                        <strong>{b.item_title}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Auction #{b.auctionid} &bull; Ends {b.enddate}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(b.bidamount).toFixed(2)}</td>
                      <td>${parseFloat(b.highest_bid).toFixed(2)}</td>
                      <td>
                        {b.is_highest_bidder ? (
                          <span className="badge badge-active">Highest Bidder</span>
                        ) : (
                          <span className="badge badge-closed">Outbid</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(b.bidtime).toLocaleString()}
                      </td>
                      <td>
                        <Link to={`/auctions/${b.auctionid}`} className="btn btn-secondary btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Won Auctions */}
      {activeTab === 'won' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Auctions Won</h2>
          {uniqueWonAuctions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No auctions won yet. When an auction closes where you are the winning bidder, it appears here.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Auction ID</th>
                    <th>Item Title</th>
                    <th>Winning Bid</th>
                    <th>Auction Status</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueWonAuctions.map((w) => {
                    const payRecord = payments.find((p) => Number(p.auctionid) === Number(w.auctionid));
                    return (
                      <tr key={w.auctionid}>
                        <td style={{ fontFamily: 'monospace' }}>#{w.auctionid}</td>
                        <td><strong>{w.item_title}</strong></td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          ${parseFloat(w.bidamount).toFixed(2)}
                        </td>
                        <td>
                          <span className="badge badge-closed">{w.auctionstatus}</span>
                        </td>
                        <td>
                          {payRecord ? (
                            <span className="badge badge-active">Paid ({payRecord.paymentmethod})</span>
                          ) : (
                            <span className="badge badge-cancelled">Payment Pending</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Link to={`/auctions/${w.auctionid}`} className="btn btn-secondary btn-sm">
                              View
                            </Link>
                            {!payRecord && (
                              <button
                                onClick={() => setPaymentModalAuction(w)}
                                className="btn btn-primary btn-sm"
                              >
                                Pay Now (Simulated)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Watchlist */}
      {activeTab === 'watchlist' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>My Watchlist</h2>
          {watchlist.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Your watchlist is empty. Add items from the browse or auction details pages.
            </div>
          ) : (
            <div className="auction-grid">
              {watchlist.map((item) => (
                <div key={item.watchlistid} className="auction-card">
                  <div className="auction-img-wrapper">
                    <ImageWithFallback src={item.imageurl} alt={item.title} className="auction-img" />
                    <span style={{ position: 'absolute', top: '8px', right: '8px' }}>
                      <span className={`badge badge-${(item.auctionstatus || item.item_status).toLowerCase()}`}>
                        {item.auctionstatus || item.item_status}
                      </span>
                    </span>
                  </div>
                  <div className="auction-body">
                    <div className="auction-meta">
                      <span>{item.categoryname}</span>
                      <span>&bull;</span>
                      <span>{item.itemcondition}</span>
                    </div>
                    <h3 className="auction-title">{item.title}</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Added on: {item.dateadded}
                    </div>
                    <div className="auction-pricing">
                      <div>
                        <div className="price-label">Current Price</div>
                        <div className="price-amount">${parseFloat(item.current_price).toFixed(2)}</div>
                      </div>
                      {item.auctionid ? (
                        <Link to={`/auctions/${item.auctionid}`} className="btn btn-primary btn-sm">
                          View
                        </Link>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unlisted</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Payments */}
      {activeTab === 'payments' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Payment Transactions</h2>
          {payments.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No payments recorded for your account.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Transaction Ref</th>
                    <th>Item</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.paymentid}>
                      <td style={{ fontFamily: 'monospace' }}>#{p.paymentid}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.transactionreference}</td>
                      <td>{p.item_title}</td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(p.amount).toFixed(2)}</td>
                      <td>{p.paymentmethod}</td>
                      <td>
                        <span className="badge badge-active">{p.paymentstatus}</span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.paymentdate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Shipping */}
      {activeTab === 'shipping' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Shipping & Tracking</h2>
          {shipments.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No shipments found.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tracking #</th>
                    <th>Item</th>
                    <th>Courier</th>
                    <th>Shipping Status</th>
                    <th>Address</th>
                    <th>Est. Delivery</th>
                    <th>Delivery Date</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.shippingid}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>
                        {s.trackingnumber}
                      </td>
                      <td>{s.item_title}</td>
                      <td>{s.courier}</td>
                      <td>
                        <span className={`badge badge-${s.shippingstatus === 'Delivered' ? 'active' : 'closed'}`}>
                          {s.shippingstatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{s.shippingaddress}</td>
                      <td style={{ fontSize: '0.82rem' }}>{s.estimateddeliverydate || '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{s.deliverydate || 'In transit'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Simulated Payment Modal */}
      {paymentModalAuction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Simulated Checkout</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              College DBMS Project Demo &bull; No real money or payment gateways are used.
            </p>

            <form onSubmit={handleSimulatePayment}>
              <div className="form-group">
                <label className="form-label">Item Title</label>
                <input type="text" disabled value={paymentModalAuction.item_title} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Amount Due</label>
                <input
                  type="text"
                  disabled
                  value={`$${parseFloat(paymentModalAuction.bidamount).toFixed(2)}`}
                  className="form-input"
                  style={{ fontWeight: 600, color: 'var(--accent)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <textarea
                  required
                  rows="2"
                  value={payAddress}
                  onChange={(e) => setPayAddress(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Courier</label>
                <select
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="form-select"
                >
                  <option value="BlueDart">BlueDart</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Delhivery">Delhivery</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalAuction(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="btn btn-primary btn-sm"
                >
                  {payLoading ? 'Processing...' : 'Confirm Simulated Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
