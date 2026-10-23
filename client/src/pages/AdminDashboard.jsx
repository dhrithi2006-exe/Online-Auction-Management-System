import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/formatINR';

export default function AdminDashboard() {
  const { user, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filter inside active tab
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch('/api/users').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/items').then((r) => r.json()),
      fetch('/api/auctions?limit=100').then((r) => r.json()),
      authFetch('/api/payments').then((r) => r.json()),
      authFetch('/api/shipping').then((r) => r.json()),
      fetch('/api/reviews').then((r) => r.json()),
    ])
      .then(([userData, catData, itemData, aucData, payData, shipData, revData]) => {
        if (userData.users) setUsers(userData.users);
        if (catData.categories) setCategories(catData.categories);
        if (itemData.items) setItems(itemData.items);
        if (aucData.auctions) setAuctions(aucData.auctions);
        if (payData.payments) setPayments(payData.payments);
        if (shipData.shipments) setShipments(shipData.shipments);
        if (revData.reviews) setReviews(revData.reviews);
      })
      .catch((err) => console.error('Admin data fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (user?.role !== 'Admin') {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.3rem', color: 'var(--danger)', marginBottom: '8px' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          This administrative interface requires an account with the <strong>Admin</strong> role.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Admin Top Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem' }}>CockroachDB System Administration</h1>
              <span className="role-tag">Admin</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Direct live ledger view of all 9 database tables in <code>auction_db</code>.
            </p>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Admin: <strong>{user?.name}</strong> (#{user?.userid})
          </div>
        </div>

        {/* Database stats summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {[
            { label: 'app_user', count: users.length },
            { label: 'category', count: categories.length },
            { label: 'item', count: items.length },
            { label: 'auction', count: auctions.length },
            { label: 'payment', count: payments.length },
            { label: 'shipping', count: shipments.length },
            { label: 'review', count: reviews.length },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '10px',
                borderRadius: 'var(--radius)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)' }}>
                {stat.count}
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px', flexWrap: 'wrap', gap: '4px' }}>
        {[
          { id: 'users', label: `Users (${users.length})` },
          { id: 'categories', label: `Categories (${categories.length})` },
          { id: 'items', label: `Items (${items.length})` },
          { id: 'auctions', label: `Auctions (${auctions.length})` },
          { id: 'payments', label: `Payments (${payments.length})` },
          { id: 'shipping', label: `Shipping (${shipments.length})` },
          { id: 'reviews', label: `Reviews (${reviews.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchFilter('');
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.88rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search within table */}
      <div style={{ marginBottom: '16px', maxWidth: '360px' }}>
        <input
          type="text"
          placeholder={`Filter records in ${activeTab}...`}
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="form-input"
        />
      </div>

      {/* Content per Tab */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Retrieving database table records...
          </div>
        ) : (
          <div className="table-container">
            {activeTab === 'users' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>UserID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(
                      (u) =>
                        !searchFilter ||
                        u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        u.role.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((u) => (
                      <tr key={u.userid}>
                        <td style={{ fontFamily: 'monospace' }}>#{u.userid}</td>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td>
                          <span className="role-tag">{u.role}</span>
                        </td>
                        <td>{u.phone || '—'}</td>
                        <td style={{ fontSize: '0.82rem' }}>{u.address || '—'}</td>
                        <td style={{ fontSize: '0.82rem' }}>{u.registrationdate}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'categories' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CategoryID</th>
                    <th>Category Name</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {categories
                    .filter(
                      (c) =>
                        !searchFilter ||
                        c.categoryname.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        (c.description && c.description.toLowerCase().includes(searchFilter.toLowerCase()))
                    )
                    .map((c) => (
                      <tr key={c.categoryid}>
                        <td style={{ fontFamily: 'monospace' }}>#{c.categoryid}</td>
                        <td><strong>{c.categoryname}</strong></td>
                        <td>{c.description || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'items' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ItemID</th>
                    <th>Title</th>
                    <th>Seller</th>
                    <th>Category</th>
                    <th>Starting Price</th>
                    <th>Condition</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter(
                      (i) =>
                        !searchFilter ||
                        i.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        i.seller_name.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((i) => (
                      <tr key={i.itemid}>
                        <td style={{ fontFamily: 'monospace' }}>#{i.itemid}</td>
                        <td><strong>{i.title}</strong></td>
                        <td>{i.seller_name} (#{i.sellerid})</td>
                        <td>{i.categoryname}</td>
                        <td>{formatINR(i.startingprice)}</td>
                        <td>{i.itemcondition}</td>
                        <td>
                          <span className={`badge badge-${i.status.toLowerCase()}`}>{i.status}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'auctions' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>AuctionID</th>
                    <th>Item Title</th>
                    <th>Dates (Start - End)</th>
                    <th>Status</th>
                    <th>Current Price</th>
                    <th>Total Bids</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions
                    .filter(
                      (a) =>
                        !searchFilter ||
                        a.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        a.auctionstatus.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((a) => (
                      <tr key={a.auctionid}>
                        <td style={{ fontFamily: 'monospace' }}>#{a.auctionid}</td>
                        <td><strong>{a.title}</strong></td>
                        <td style={{ fontSize: '0.82rem' }}>
                          {a.startdate} &rarr; {a.enddate}
                        </td>
                        <td>
                          <span className={`badge badge-${a.auctionstatus.toLowerCase()}`}>
                            {a.auctionstatus}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatINR(a.current_price)}</td>
                        <td>{a.total_bids}</td>
                        <td>{a.winneruserid ? `#${a.winneruserid}` : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'payments' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PaymentID</th>
                    <th>Transaction Ref</th>
                    <th>Auction #</th>
                    <th>Buyer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .filter(
                      (p) =>
                        !searchFilter ||
                        p.transactionreference.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        p.buyer_name.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((p) => (
                      <tr key={p.paymentid}>
                        <td style={{ fontFamily: 'monospace' }}>#{p.paymentid}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.transactionreference}
                        </td>
                        <td>#{p.auctionid} ({p.item_title})</td>
                        <td>{p.buyer_name}</td>
                        <td style={{ fontWeight: 600 }}>{formatINR(p.amount)}</td>
                        <td>{p.paymentmethod}</td>
                        <td>
                          <span className="badge badge-active">{p.paymentstatus}</span>
                        </td>
                        <td>{p.paymentdate}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'shipping' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ShippingID</th>
                    <th>Tracking #</th>
                    <th>Item</th>
                    <th>Courier</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Dispatch</th>
                    <th>Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments
                    .filter(
                      (s) =>
                        !searchFilter ||
                        s.trackingnumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        s.courier.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((s) => (
                      <tr key={s.shippingid}>
                        <td style={{ fontFamily: 'monospace' }}>#{s.shippingid}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>
                          {s.trackingnumber}
                        </td>
                        <td>{s.item_title}</td>
                        <td>{s.courier}</td>
                        <td style={{ fontSize: '0.82rem' }}>{s.shippingaddress}</td>
                        <td>
                          <span className={`badge badge-${s.shippingstatus === 'Delivered' ? 'active' : 'closed'}`}>
                            {s.shippingstatus}
                          </span>
                        </td>
                        <td>{s.dispatchdate || '—'}</td>
                        <td>{s.deliverydate || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {activeTab === 'reviews' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ReviewID</th>
                    <th>Reviewer</th>
                    <th>Reviewee</th>
                    <th>Auction</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews
                    .filter(
                      (r) =>
                        !searchFilter ||
                        r.reviewer_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        r.reviewee_name.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((r) => (
                      <tr key={r.reviewid}>
                        <td style={{ fontFamily: 'monospace' }}>#{r.reviewid}</td>
                        <td><strong>{r.reviewer_name}</strong></td>
                        <td><strong>{r.reviewee_name}</strong></td>
                        <td>#{r.auctionid} ({r.item_title})</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>
                          {'★'.repeat(Number(r.rating))} ({r.rating}/5)
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{r.comment || '—'}</td>
                        <td style={{ fontSize: '0.82rem' }}>{r.reviewdate}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
