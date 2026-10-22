import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <strong>BidHouse</strong> — Online Auction Management System
        </div>
        <div style={{ color: '#8a867e' }}>
          College DBMS Project &bull; Built with Node.js, Express, React, and CockroachDB
        </div>
      </div>
    </footer>
  );
}
