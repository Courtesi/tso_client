import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import { faqs } from '../data/faqs';
import GridBackground from '../components/GridBackground';

function FAQ() {
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	return (
		<>
		<Helmet>
			<title>FAQ | TrueShotOdds</title>
			<meta name="description" content="Answers to common questions about arbitrage betting, +EV betting, TrueShotOdds pricing, supported sportsbooks, and more." />
			<link rel="canonical" href="https://trueshotodds.com/faq" />
			<meta property="og:url" content="https://trueshotodds.com/faq" />
			<meta property="og:title" content="FAQ | TrueShotOdds" />
			<meta property="og:description" content="Answers to common questions about arbitrage betting, +EV betting, TrueShotOdds pricing, and supported sportsbooks." />
			<script type="application/ld+json">{JSON.stringify({
				"@context": "https://schema.org",
				"@type": "FAQPage",
				"mainEntity": faqs.map(({ question, answer }) => ({
					"@type": "Question",
					"name": question,
					"acceptedAnswer": {
						"@type": "Answer",
						"text": answer,
					},
				})),
			})}</script>
		</Helmet>
		<div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-indigo-900 to-indigo-950">
			<Navbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />

			{/* Hero */}
			<div className="container mx-auto px-4 pt-36 pb-12 max-w-3xl">
				<GridBackground height="20rem"/>
				<h1 className="heading-hero text-4xl lg:text-6xl text-gray-100 text-center mb-6">
					Frequently Asked Questions
				</h1>
				<p className="text-xl text-gray-300 text-center">
					Everything you need to know about arbitrage betting, +EV betting, and TrueShotOdds.
				</p>
			</div>

			{/* FAQ List */}
			<div className="w-full bg-gray-900 py-16 px-4">
				<div className="max-w-3xl mx-auto space-y-3">
					{faqs.map((faq, i) => (
						<div key={i} className="bg-gray-800/50 rounded-xl border border-white/10 overflow-hidden">
							<button
								className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 cursor-pointer"
								onClick={() => setOpenIndex(openIndex === i ? null : i)}
							>
								<span className="text-lg font-semibold text-gray-100">{faq.question}</span>
								<svg
									className={`w-5 h-5 text-indigo-400 flex-shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
									fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
								>
									<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
							{openIndex === i && (
								<div className="px-6 pb-5 text-gray-300 text-lg leading-relaxed">
									{faq.answer}
								</div>
							)}
						</div>
					))}
				</div>

				{/* CTA */}
				<div className="max-w-3xl mx-auto mt-16 text-center">
					<p className="text-gray-300 text-xl mb-6">Still have questions? Reach out anytime.</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						{currentUser ? (
							<button
								onClick={() => navigate('/dashboard')}
								className="bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
							>
								Go to Dashboard
							</button>
						) : (
							<button
								onClick={() => setIsAuthModalOpen(true)}
								className="bg-gray-100 hover:bg-gray-300 text-black text-xl font-semibold py-3 px-12 rounded-lg transition-colors cursor-pointer"
							>
								Get Started Free
							</button>
						)}
						<a
							href="mailto:support@trueshotodds.com"
							className="bg-gray-700 hover:bg-gray-600 text-white text-xl font-semibold py-3 px-12 rounded-lg transition-colors text-center"
						>
							Contact Support
						</a>
					</div>
				</div>
			</div>

			<Footer />
		</div>

		<AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
		</>
	);
}

export default FAQ;