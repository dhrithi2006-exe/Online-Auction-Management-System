import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageWithFallback from '../components/ImageWithFallback';
import { formatINR } from '../utils/formatINR';

export default function SellerDashboard() {
  const { user, authFetch } = useAuth();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Listing Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [condition, setCondition] = useState('New');
  const [imageUrl, setImageUrl] = useState('');
  const [createAuction, setCreateAuction] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reservePrice, setReservePrice] = useState('');

  // Edit item state
  const [editingItem, setEditingItem] = useState(null);

  const [formLoading, setFormLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadSellerData = () => {
    setLoading(true);
    Promise.all([
      authFetch(`/api/items?sellerid=${user?.userid}`).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      authFetch('/api/shipping').then((r) => r.json()),
    ])
      .then(([itemData, catData, shipData]) => {
        if (itemData.items) setItems(itemData.items);
        if (catData.categories) {
          setCategories(catData.categories);
          if (catData.categories.length > 0 && !categoryId) {
            setCategoryId(catData.categories[0].categoryid);
          }
        }
        if (shipData.shipments) setShipments(shipData.shipments);
      })
      .catch((err) => console.error('Seller data error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      loadSellerData();
    }
  }, [user]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFeedback(null);

    try {
      const res = await authFetch('/api/items', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          categoryid: Number(categoryId),
          startingprice: parseFloat(startingPrice),
          itemcondition: condition,
          imageurl: imageUrl,
          createAuction,
          startdate: startDate,
          enddate: endDate,
          reserveprice: reservePrice ? parseFloat(reservePrice) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list item.');

      setFeedback({ type: 'success', message: 'Item and auction listed successfully in database.' });
      setShowCreateModal(false);
      // Reset form
      setTitle('');
      setDescription('');
      setStartingPrice('');
      setImageUrl('');
      loadSellerData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFeedback(null);

    try {
      const res = await authFetch(`/api/items/${editingItem.itemid}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editingItem.title,
          description: editingItem.description,
          categoryid: Number(editingItem.categoryid),
          startingprice: parseFloat(editingItem.startingprice),
          itemcondition: editingItem.itemcondition,
          imageurl: editingItem.imageurl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item.');

      setFeedback({ type: 'success', message: 'Item updated successfully.' });
      setEditingItem(null);
      loadSellerData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateShipping = async (shippingId, nextStatus) => {
    try {
      const res = await authFetch(`/api/shipping/${shippingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update shipping.');
      }
      loadSellerData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseAuction = async (auctionId) => {
    if (!window.confirm(`Are you sure you want to conclude Auction #${auctionId}? The highest qualifying bidder will be declared winner, or the item will be marked Unsold if the reserve price is not met.`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/auctions/${auctionId}/close`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close auction.');
      setFeedback({ type: 'success', message: data.message });
      loadSellerData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div>
      {/* Seller Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem' }}>Seller Management Portal</h1>
              <span className="role-tag">{user?.role}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Manage your inventory, active auctions, and shipment fulfillment.
            </p>
          </div>

          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            + List New Item
          </button>
        </div>
      </div>

      {feedback && <div className={`alert alert-${feedback.type}`}>{feedback.message}</div>}

      {/* Seller Listings Table */}
      <div className="card" style={{ marginBottom: '32px' }}>
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
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Your Listed Items & Auctions</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {items.length} {items.length === 1 ? 'item' : 'items'} in inventory
          </span>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            You haven't listed any items yet. Click <strong>+ List New Item</strong> to create your first listing!
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Condition</th>
                  <th>Starting Price</th>
                  <th>Current Highest</th>
                  <th>Auction Status</th>
                  <th>Bids</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.itemid}>
                    <td style={{ fontFamily: 'monospace' }}>#{it.itemid}</td>
                    <td>
                      <strong>{it.title}</strong>
                      {it.auctionid && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Auction #{it.auctionid} &bull; Ends {it.enddate}
                        </div>
                      )}
                    </td>
                    <td>{it.categoryname}</td>
                    <td>{it.itemcondition}</td>
                    <td>{formatINR(it.startingprice)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      {formatINR(it.current_price)}
                    </td>
                    <td>
                      <span className={`badge badge-${(it.auctionstatus || it.status).toLowerCase()}`}>
                        {it.auctionstatus || it.status}
                      </span>
                    </td>
                    <td>{it.total_bids}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {it.auctionid && (
                          <Link to={`/auctions/${it.auctionid}`} className="btn btn-secondary btn-sm">
                            View
                          </Link>
                        )}
                        <button
                          onClick={() => setEditingItem(it)}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                        {it.auctionid && it.auctionstatus === 'Active' && (
                          <button
                            onClick={() => handleCloseAuction(it.auctionid)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--accent)', borderColor: 'var(--accent-border)' }}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shipment Fulfillment Section */}
      <div className="card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px' }}>
          Orders & Shipment Fulfillment
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Dispatch and mark items as shipped or delivered once buyer payment is received.
        </p>

        {shipments.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No pending or active shipments for your listed items.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking #</th>
                  <th>Item</th>
                  <th>Buyer</th>
                  <th>Courier</th>
                  <th>Shipping Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.shippingid}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.trackingnumber}</td>
                    <td>{s.item_title}</td>
                    <td>{s.buyer_name}</td>
                    <td>{s.courier}</td>
                    <td style={{ fontSize: '0.82rem' }}>{s.shippingaddress}</td>
                    <td>
                      <span className={`badge badge-${s.shippingstatus === 'Delivered' ? 'active' : 'closed'}`}>
                        {s.shippingstatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {s.shippingstatus === 'Processing' && (
                          <button
                            onClick={() => handleUpdateShipping(s.shippingid, 'Shipped')}
                            className="btn btn-primary btn-sm"
                          >
                            Mark Shipped
                          </button>
                        )}
                        {s.shippingstatus === 'Shipped' && (
                          <button
                            onClick={() => handleUpdateShipping(s.shippingid, 'Delivered')}
                            className="btn btn-secondary btn-sm"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Item Modal */}
      {showCreateModal && (
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
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>List a New Auction Item</h3>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Item Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vintage Mechanical Keyboard"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows="3"
                  placeholder="Detailed physical condition and features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-select"
                  >
                    {categories.map((c) => (
                      <option key={c.categoryid} value={c.categoryid}>
                        {c.categoryname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="form-select"
                  >
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                    <option value="Refurbished">Refurbished</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Starting Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="2500.00"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Auction Schedule Section */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '14px',
                  borderRadius: 'var(--radius)',
                  marginBottom: '16px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    checked={createAuction}
                    onChange={(e) => setCreateAuction(e.target.checked)}
                  />
                  Launch Auction immediately
                </label>

                {createAuction && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Reserve Price (₹ Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Leave empty if no minimum reserve"
                        value={reservePrice}
                        onChange={(e) => setReservePrice(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary btn-sm">
                  {formLoading ? 'Publishing to Database...' : 'Save & List Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
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
          <div className="card" style={{ maxWidth: '500px', width: '100%', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Edit Item #{editingItem.itemid}</h3>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows="3"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={editingItem.categoryid}
                    onChange={(e) => setEditingItem({ ...editingItem, categoryid: e.target.value })}
                    className="form-select"
                  >
                    {categories.map((c) => (
                      <option key={c.categoryid} value={c.categoryid}>
                        {c.categoryname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select
                    value={editingItem.itemcondition}
                    onChange={(e) => setEditingItem({ ...editingItem, itemcondition: e.target.value })}
                    className="form-select"
                  >
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                    <option value="Refurbished">Refurbished</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Starting Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingItem.startingprice}
                    onChange={(e) => setEditingItem({ ...editingItem, startingprice: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="url"
                    value={editingItem.imageurl || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, imageurl: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={formLoading} className="btn btn-primary btn-sm">
                  {formLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
