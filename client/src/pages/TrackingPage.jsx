import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function TrackingPage() {
  const { authFetch } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/shipping')
      .then((r) => r.json())
      .then((data) => {
        if (data.shipments) setShipments(data.shipments);
      })
      .catch((err) => console.error('Tracking fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredShipments = shipments.filter(
    (s) =>
      !searchTerm ||
      s.trackingnumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.courier && s.courier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.item_title && s.item_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '6px' }}>
          Shipping & Delivery Tracking
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Check real-time dispatch and delivery status for auction transactions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <label className="form-label">Look Up by Tracking Number or Item Title</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="e.g. TRK2001 or Wireless Headphones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="btn btn-secondary btn-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Retrieving shipment ledgers...
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            No shipping records found matching "{searchTerm}".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredShipments.map((s) => (
            <div key={s.shippingid} className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '12px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Tracking Number
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                    {s.trackingnumber}
                  </div>
                </div>

                <div>
                  <span className={`badge badge-${s.shippingstatus === 'Delivered' ? 'active' : 'closed'}`}>
                    {s.shippingstatus}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Item Description</div>
                  <div style={{ fontWeight: 600 }}>{s.item_title}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Courier Partner</div>
                  <div>{s.courier}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Dispatch Date</div>
                  <div>{s.dispatchdate || 'Pending dispatch'}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Est. Delivery Date</div>
                  <div>{s.estimateddeliverydate || 'Calculating...'}</div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Delivery Destination</div>
                  <div>{s.shippingaddress}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
