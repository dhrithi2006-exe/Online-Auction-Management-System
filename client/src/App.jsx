import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import AuctionDetailsPage from './pages/AuctionDetailsPage';
import LoginPage from './pages/LoginPage';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TrackingPage from './pages/TrackingPage';

function NotFoundPage() {
  return (
    <div className="card" style={{ maxWidth: '480px', margin: '60px auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="btn btn-primary btn-sm">
        Return Home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/auctions/:id" element={<AuctionDetailsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/buyer" element={<BuyerDashboard />} />
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
