import { Eye, Star, Component, Gem, Crown, Medal, ArrowRight, Check } from 'lucide-react';
import useScrollToTop from '../hooks/useScrollToTop';
import usePageSEO from '../hooks/usePageSEO';
import Navbar from '../components/landingnew/Navbar/Navbar';
import Footer from '../components/landingnew/Footer/Footer';
import DotField from '../components/landingnew/Hero/DotField';
import { diamondSponsors, platinumSponsors, silverSponsors } from '../constants/Sponsors';
import { FaArrowRight } from 'react-icons/fa6';

import '../css/sponsors-page.css';

const buildSponsorUrl = (url, tier) => {
  if (!url) return null;
  try {
    const sponsorUrl = new URL(url);
    sponsorUrl.searchParams.set('utm_source', 'reactbits');
    sponsorUrl.searchParams.set('utm_medium', 'sponsor');
    sponsorUrl.searchParams.set('utm_campaign', tier);
    sponsorUrl.searchParams.set('ref', 'reactbits');
    return sponsorUrl.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}utm_source=reactbits&utm_medium=sponsor&utm_campaign=${tier}&ref=reactbits`;
  }
};

const STATS = [
  { icon: Eye, value: '500K+', label: 'Monthly Visitors' },
  { icon: Star, value: '43K+', label: 'GitHub Stars' },
  { icon: Component, value: '140+', label: 'Components' },
];

const TIERS = [
  { key: 'diamond', label: 'Diamond', icon: Gem, sponsors: diamondSponsors },
  { key: 'platinum', label: 'Platinum', icon: Crown, sponsors: platinumSponsors },
  { key: 'silver', label: 'Silver', icon: Medal, sponsors: silverSponsors },
].filter(tier => tier.sponsors.length > 0);

// Polar checkout links per sponsorship tier
const PRICING = [
  {
    key: 'diamond',
    label: 'Diamond',
    icon: Gem,
    price: 500,
    checkoutUrl: 'https://buy.polar.sh/polar_cl_CAKYEZJI4v1T5QdfNfAVAmDhyNVfPVBj6lNaF0H6bII',
    featured: true,
    benefits: [
      'Largest logo on the docs sidebar',
      'Largest logo in the README',
      'Shoutout on X',
      'Featured on the sponsors page',
      'Direct line for feedback & requests'
    ]
  },
  {
    key: 'platinum',
    label: 'Platinum',
    icon: Crown,
    price: 250,
    checkoutUrl: 'https://buy.polar.sh/polar_cl_d9UlbstPFQlba5YiLjFHjfhQ8LwVfhQTZKGxf1HiJZ7',
    featured: false,
    benefits: ['Larger logo in the README', 'Larger logo on the docs sidebar', 'Shoutout on X']
  },
  {
    key: 'silver',
    label: 'Silver',
    icon: Medal,
    price: 100,
    checkoutUrl: 'https://buy.polar.sh/polar_cl_XQulCE8GgwOmHo7wLjdDYkMZFm6nYogF3Igfl4cqAfM',
    featured: false,
    benefits: ['Logo in the README', 'Logo on the docs sidebar', 'Listed on the sponsors page']
  }
];

const SponsorsPage = () => {
  useScrollToTop();
  usePageSEO({
    title: 'React Bits - Sponsors',
    description:
      'Sponsor React Bits and get your brand in front of 500K+ developers monthly. Simple monthly plans for Diamond, Platinum and Silver tiers.',
    path: '/sponsors'
  });

  return (
    <>
      <Navbar showDocs />
      <div className="sponsors-dotfield">
        <DotField sparkle waveAmplitude={5} dotRadius={2} />
      </div>
      <section className="sponsors-page">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="sponsors-page-header">
          <div className="sponsors-page-header-left">
            <h1 className="sponsors-page-title">Sponsors</h1>
            <p className="sponsors-page-subtitle">
              Your support keeps React Bits free and open-source for developers everywhere.
            </p>
          </div>
          <a href="#sponsor-plans" className="sponsors-page-cta">
            Become a Sponsor <FaArrowRight size={12} />
          </a>
        </div>

        {/* ── Tiers ───────────────────────────────────────────────── */}
        {TIERS.map(tier => (
          <div className="sponsors-tier-section" key={tier.key}>
            <div className="sponsors-tier-header">
              <span className={`sponsors-tier-badge sponsors-tier-badge--${tier.key}`}>
                <tier.icon size={13} />
                {tier.label}
              </span>
            </div>

            {tier.sponsors.length > 0 ? (
              <div className={`sponsors-tier-grid sponsors-tier-grid--${tier.key}`}>
                {tier.sponsors.map(sponsor => {
                  const href = buildSponsorUrl(sponsor.url, tier.key);
                  return (
                    <a
                      key={sponsor.id}
                      href={href}
                      target="_blank"
                      rel="noopener"
                      className="sponsors-page-card"
                    >
                      <div className={`sponsors-card-banner sponsors-card-banner--${tier.key}`}>
                        <img
                          className="sponsors-card-logo"
                          src={sponsor.imageUrl}
                          alt={sponsor.name}
                        />
                      </div>
                      <div className="sponsors-card-body">
                        <span className="sponsors-card-name">{sponsor.name}</span>
                        <span className="sponsors-card-arrow">
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="sponsors-tier-empty">Available — reach out to claim this spot</div>
            )}
          </div>
        ))}

        {/* ── Pricing ─────────────────────────────────────────────── */}

        <div className="sponsors-section-heading" id="sponsor-plans">
          <h2 className="sponsors-section-title">Become a sponsor</h2>
          <p className="sponsors-section-subtitle">Power the fastest growing open-source creative UI library, cancel anytime.</p>
        </div>
        <div className="sponsors-pricing">
          {PRICING.map(tier => (
            <div
              key={tier.key}
              className={`sponsors-pricing-card${tier.featured ? ' sponsors-pricing-card--featured' : ''}`}
            >
              <span className={`sponsors-tier-badge sponsors-tier-badge--${tier.key}`}>
                <tier.icon size={13} />
                {tier.label}
              </span>
              <div className="sponsors-pricing-price">
                ${tier.price}
                <span className="sponsors-pricing-period">/month</span>
              </div>
              <ul className="sponsors-pricing-benefits">
                {tier.benefits.map(benefit => (
                  <li key={benefit}>
                    <Check size={14} />
                    {benefit}
                  </li>
                ))}
              </ul>
              <a
                href={tier.checkoutUrl}
                target="_blank"
                rel="noopener"
                className={`sponsors-pricing-btn${tier.featured ? ' sponsors-pricing-btn--featured' : ''}`}
              >
                Sponsor as {tier.label} <ArrowRight size={14} />
              </a>
            </div>
          ))}
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="sponsors-stats">
          {STATS.map(s => (
            <div className="sponsors-stat" key={s.label}>
              <span className="sponsors-stat-icon"><s.icon size={22} /></span>
              <span className="sponsors-stat-value">{s.value}</span>
              <span className="sponsors-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <p className="sponsors-pricing-note">
          Questions or custom packages?{' '}
          <a href="mailto:contact@davidhaz.com?subject=React%20Bits%20Sponsorship%20Inquiry">Get in touch</a>
        </p>
      </section>
      <Footer />
    </>
  );
};

export default SponsorsPage;
