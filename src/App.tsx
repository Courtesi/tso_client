import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { StripeProvider } from './contexts/StripeContext';
import { DataProvider } from './contexts/DataContext';
import { SidebarProvider } from './contexts/SidebarContext';
import Home from './pages/Home';
import VerificationBanner from './components/VerificationBanner';

// Every route except the landing page is split into its own chunk, so first-time
// visitors don't download the dashboard, charts, or learn pages up front.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Charts = lazy(() => import('./pages/Charts'));
const EVBets = lazy(() => import('./pages/EVBets'));
const Settings = lazy(() => import('./pages/Settings'));
const Subscription = lazy(() => import('./pages/Subscription'));
const ArbitrageBetting = lazy(() => import('./pages/ArbitrageBetting'));
const EVBetting = lazy(() => import('./pages/EVBetting'));
const Lines = lazy(() => import('./pages/Lines'));
const FAQ = lazy(() => import('./pages/FAQ'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
	return (
		<HelmetProvider>
		<Router>
			<AuthProvider>
				<SettingsProvider>
					<StripeProvider>
						<DataProvider>
							<SidebarProvider>
								<VerificationBanner />
								{/* Chunks are small and cached after first load; a blank page in the
								    site's base color avoids a flash of spinner on fast connections */}
								<Suspense fallback={<div className="min-h-screen bg-indigo-900" />}>
									<Routes>
										<Route path="/" element={<Home />} />
										<Route path="/dashboard" element={<Dashboard />} />
										<Route path="/charts" element={<Charts />} />
										<Route path="/ev-bets" element={<EVBets />} />
										<Route path="/settings" element={<Settings />} />
										<Route path="/pricing" element={<Subscription />} />
										<Route path="/lines" element={<Lines />} />
										<Route path="/arbitrage-betting" element={<ArbitrageBetting />} />
										<Route path="/ev-betting" element={<EVBetting />} />
										<Route path="/faq" element={<FAQ />} />
										<Route path="*" element={<NotFound />} />
									</Routes>
								</Suspense>
							</SidebarProvider>
						</DataProvider>
					</StripeProvider>
				</SettingsProvider>
			</AuthProvider>
		</Router>
		</HelmetProvider>
	);
}

export default App;
