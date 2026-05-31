import { useState, useEffect } from 'react';
import './Callout.css';

const FACTS = [
  '📜 The NYSE was founded in 1792 under a buttonwood tree on Wall Street.',
  '💥 Black Tuesday (Oct 29, 1929) saw the Dow drop 12% — triggering the Great Depression.',
  '🐂 The longest bull market in history ran from 2009 to 2020 — 11 years without a 20% drop.',
  '🌍 The Tokyo Stock Exchange is the world\'s third largest by market cap.',
  '📉 The 1987 "Black Monday" crash saw the Dow fall 22.6% in a single day.',
  '🏦 Warren Buffett bought his first stock at age 11 — 3 shares of Cities Service at $38.',
  '🚀 Amazon\'s stock rose over 100,000% from its 1997 IPO price of $18.',
  '🎲 Stock Ticker was first published as a board game in 1937.',
  '🪙 Gold has been used as currency for over 5,000 years.',
  '🛢️ Oil futures went negative for the first time in history in April 2020.',
  '📈 The S&P 500 has averaged about 10% annual returns over the past century.',
  '🌾 The Chicago Board of Trade, founded in 1848, was the world\'s first futures exchange.',
  '💸 The Dutch East India Company issued the world\'s first shares in 1602.',
  '🔔 The NYSE opening bell tradition started in 1903 — it was a gong before that.',
  '🤖 Over 70% of US stock trades today are executed by algorithms.',
];

// Pick a random fact, then rotate every 8 seconds.
function useFact() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * FACTS.length));
  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % FACTS.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);
  return FACTS[idx];
}

export default function Callout({ callout }) {
  const fact = useFact();

  if (!callout?.text) {
    return <div className="callout-line empty">{fact}</div>;
  }
  return (
    <div className="callout-line" key={callout.id}>
      <span className="callout-text">{callout.text}</span>
    </div>
  );
}
