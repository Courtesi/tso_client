import { Helmet } from 'react-helmet-async';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStripe } from '../contexts/StripeContext';
import { useParticles } from '../contexts/ParticlesContext';
import Navbar from '../components/Navbar';
import Particles from "@tsparticles/react";
import AuthModal from '../components/AuthModal';
import Footer from '../components/Footer';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { api } from '../services/api';


function Subscription() {
	const { currentUser, userTier } = useAuth();
	const { products, loading, error, fetchProducts, subscription } = useStripe();
	const { init } = useParticles();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [checkoutLoading, setCheckoutLoading] = useState(false);
	const [portalLoading, setPortalLoading] = useState(false);

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	const particlesOptions = useMemo(() => ({
		background: {
			color: {
				value: "transparent",
			},
		},
		fpsLimit: 60,
		fullScreen: {
			enable: false,
		},
		responsive: [],
		particles: {
			number: {
				value: 150,
				density: {
					enable: false
				}
			},
			color: {
				value: "#ffffff",
			},
			shape: {
				type: "circle",
			},
			opacity: {
				value: { min: 0.1, max: 0.8 },
				animation: {
					enable: true,
					speed: 0.5,
					sync: false,
				},
			},
			size: {
				value: { min: 0.5, max: 2.5 },
			},
			move: {
				enable: true,
				speed: 0.1,
				direction: "none" as const,
				random: false,
				straight: false,
				outModes: {
					default: "bounce" as const,
				},
			},
		},
		detectRetina: true,
	}), []);

	const handleCheckout = async (priceId: string) => {
		if (!currentUser) {
			setIsAuthModalOpen(true);
			return;
		}

		try {
			setCheckoutLoading(true);

			// Create a checkout session document in Firestore
			// The Firebase Extension will listen to this and create a Stripe checkout session
			const checkoutSessionRef = collection(
				db,
				'customers',
				currentUser.uid,
				'checkout_sessions'
			);

			const docRef = await addDoc(checkoutSessionRef, {
				price: priceId,
				success_url: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
				cancel_url: window.location.href,
				mode: 'subscription',
			});

			// Listen for the session to be created by the extension
			const unsubscribe = onSnapshot(docRef, async (snap) => {
				const data = snap.data();

				if (data?.error) {
					// Handle error
					console.error('Checkout session error:', data.error);
					alert(`An error occurred: ${data.error.message}`);
					setCheckoutLoading(false);
					unsubscribe();
					return;
				}

				if (data?.url) {
					// Redirect directly to the Stripe Checkout URL provided by the extension
					window.location.assign(data.url);
					unsubscribe();
				}
			});
		} catch (err) {
			console.error('Error creating checkout session:', err);
			alert('Failed to start checkout. Please try again.');
			setCheckoutLoading(false);
		}
	};

	const handleManageSubscription = async () => {
		if (!currentUser) {
			alert('Please sign in to manage your subscription');
			return;
		}

		try {
			setPortalLoading(true);

			// Call the API service to create portal session
			const { url } = await api.createPortalSession({ returnUrl: window.location.href});

			// Redirect to the Stripe Customer Portal
			// Note: We don't set loading to false because we're redirecting away
			window.location.assign(url);
		} catch (err: unknown) {
			console.error('Error creating portal session:', err);

			let errorMessage = 'Failed to open customer portal. ';
			const message = err instanceof Error ? err.message : '';

			if (message.includes('No Stripe customer found')) {
				errorMessage += 'No subscription found. Please subscribe first.';
			} else if (message) {
				errorMessage += message;
			} else {
				errorMessage += 'Please try again or contact support.';
			}

			alert(errorMessage);
			setPortalLoading(false);
		}
	};

	return (
		<>
		<Helmet>
			<title>Pricing | TrueShotOdds</title>
			<meta name="description" content="Start finding arbitrage and +EV bets today. Free and Premium plans available. Real-time odds tracking across 10+ sportsbooks." />
			<link rel="canonical" href="https://trueshotodds.com/pricing" />
			<meta property="og:url" content="https://trueshotodds.com/pricing" />
			<meta property="og:title" content="Pricing | TrueShotOdds" />
			<meta property="og:description" content="Start finding arbitrage and +EV bets today. Free and Premium plans available." />
		</Helmet>
		<div className="min-h-screen flex flex-col text-white relative bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900">
			{/* Starry Background */}
			{init && (
				<Particles
					key="stable-particles"
					id="pricing-particles"
					className="fixed inset-0 z-0 pointer-events-none"
					options={particlesOptions}
				/>
			)}

			{/* Navigation Bar */}
			<Navbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />

			<div className="flex-1 container mx-auto px-4 py-20 pt-32">
				{/* Header */}
				<div className="text-center mb-20">
					<h1 className="heading-hero uppercase text-4xl md:text-5xl text-gray-100 mb-4">
						Unlock Live Bets with Premium
					</h1>
				</div>

				{/* Active Subscription Info */}
				{currentUser && (subscription || userTier === 'premium') && (
					<div className="max-w-3xl mx-auto mb-12 bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border border-green-500/30 rounded-xl p-6">
						<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
							<div>
								<h3 className="text-xl font-bold text-white mb-2">Active Subscription</h3>
								<p className="text-gray-200">
									{subscription?.product?.name || 'Premium Plan'}
									{subscription?.cancel_at_period_end && (
										<span className="ml-2 text-yellow-400">(Cancels at period end)</span>
									)}
								</p>
								{subscription?.current_period_end && (
									<p className="text-sm text-gray-300 mt-1">
										{subscription?.cancel_at_period_end ? 'Access until' : 'Renews on'}{' '}
										{new Date(subscription!.current_period_end.seconds * 1000).toLocaleDateString()}
									</p>
								)}
							</div>
							<button
								onClick={handleManageSubscription}
								disabled={portalLoading}
								className="backdrop-blur-lg bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-colors border border-white/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{portalLoading ? 'Opening portal...' : 'Manage Subscription'}
							</button>
						</div>
					</div>
				)}

				{/* Loading State */}
				{loading && (
					<div className="text-center text-gray-400 py-12">
						Loading pricing plans...
					</div>
				)}

				{/* Error State */}
				{error && (
					<div className="max-w-2xl mx-auto bg-red-900 bg-opacity-50 border border-red-500 rounded-xl p-4 text-red-200">
						{error}
					</div>
				)}

				{/* Products Grid */}
				{!loading && !error && (
					<div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8">
						{[...products]
							.sort((a, b) => (a.priceInfo.unit_amount || 0) - (b.priceInfo.unit_amount || 0))
							.map((product) => {
								const price = product.priceInfo;
								const isFree = (price.unit_amount || 0) === 0;
								const formattedPrice = isFree
									? '$0'
									: new Intl.NumberFormat('en-US', {
										style: 'currency',
										currency: price.currency || 'USD',
									}).format((price.unit_amount || 0) / 100);
								const interval = price.interval || 'month';

								return (
									<div
										key={product.id}
										className={isFree
											? 'bg-slate-900 backdrop-blur-md border border-gray-500/20 shadow-xl rounded-xl p-8'
											: 'bg-gradient-to-b from-fuchsia-700/50 to-violet-900/50 backdrop-blur-md border border-indigo-500 shadow-xl rounded-xl p-8 relative'
										}
									>
										<div className="text-left mb-8">
											<h3 className="capitalize text-3xl font-bold text-white mb-2">
												{product.name}
											</h3>
											<p className={`text-sm ${isFree ? 'text-gray-200' : 'text-gray-100'}`}>
												{product.description}
											</p>
											<div className={`text-4xl font-bold mt-4 ${isFree ? 'text-gray-100' : 'text-white'}`}>
												{formattedPrice}
												{!isFree && <span className="text-lg text-gray-200">/{interval}</span>}
											</div>
										</div>

										{isFree ? (
											currentUser && userTier === 'free' ? (
												<button
													disabled
													className="w-full backdrop-blur-lg bg-gray-700/50 text-gray-400 font-semibold py-3 px-8 rounded-lg cursor-not-allowed"
												>
													Current Plan
												</button>
											) : currentUser && userTier === 'premium' ? (
												<div className="relative group">
													<button
														disabled
														className="w-full backdrop-blur-lg bg-gray-700/50 text-gray-400 font-semibold py-3 px-8 rounded-lg cursor-not-allowed"
													>
														Choose
													</button>
													<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700 shadow-lg">
														Manage your subscription through "Manage Subscription"
													</div>
												</div>
											) : (
												<button
													onClick={() => setIsAuthModalOpen(true)}
													className="w-full backdrop-blur-lg bg-gray-700/50 text-white font-semibold py-3 px-8 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
												>
													Choose
												</button>
											)
										) : (
											userTier === 'premium' ? (
												<button
													disabled
													className="w-full backdrop-blur-lg bg-gray-700/50 text-gray-300 font-semibold py-3 px-8 rounded-lg cursor-not-allowed"
												>
													✓ Current Plan
												</button>
											) : (
												<button
													onClick={() => handleCheckout(product.priceId)}
													disabled={checkoutLoading}
													className="w-full backdrop-blur-lg bg-gray-100 hover:bg-gray-300 text-black font-bold py-3 px-8 rounded-lg transition-colors shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{checkoutLoading ? 'Loading...' : `Upgrade to ${product.name}`}
												</button>
											)
										)}

										<ul className="space-y-3 mt-8 justify-start text-sm">
											{product.features?.map((feature, index) => (
												<li key={index} className={`font-medium ${isFree ? 'text-gray-200' : 'text-white'}`}>
													<img
														className="inline-block w-8 h-8 mr-2"
														src={"/checkmark.png"}
													/>
													{feature}
												</li>
											))}
										</ul>
									</div>
								);
							})}
					</div>
				)}

			</div>

			<AuthModal
				isOpen={isAuthModalOpen}
				onClose={() => setIsAuthModalOpen(false)}
			/>
			<Footer/>
		</div>
		</>
	);
}

export default Subscription;
