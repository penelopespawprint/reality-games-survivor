import React, { useEffect, useState } from "react";
import "./TorchRevealAnimation.css";

interface TorchRevealAnimationProps {
  onComplete: () => void;
}

const TorchRevealAnimation: React.FC<TorchRevealAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'fade-in' | 'reveal' | 'scroll-up' | 'complete'>('fade-in');

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('reveal'), 500);
    const timer2 = setTimeout(() => setStage('scroll-up'), 2500);
    const timer3 = setTimeout(() => {
      setStage('complete');
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (stage === 'complete') return null;

  return (
    <div className={`torch-reveal ${stage}`}>
      <div className="torch-background">
        {/* Flickering torch light effect */}
        <div className="torch-glow"></div>

        {/* Floating embers */}
        <div className="ember ember-1"></div>
        <div className="ember ember-2"></div>
        <div className="ember ember-3"></div>
        <div className="ember ember-4"></div>
        <div className="ember ember-5"></div>

        {/* Rising smoke */}
        <div className="smoke smoke-1"></div>
        <div className="smoke smoke-2"></div>
        <div className="smoke smoke-3"></div>

        {/* Parchment scroll */}
        <div className="parchment-scroll">
          {/* Tribal symbols in corners */}
          <div className="tribal-symbol symbol-top-left">⚡</div>
          <div className="tribal-symbol symbol-top-right">🔥</div>
          <div className="tribal-symbol symbol-bottom-left">🌊</div>
          <div className="tribal-symbol symbol-bottom-right">⛰️</div>

          {/* Main message */}
          <div className="parchment-text">
            <div className="week-badge">🪶 WEEK 3 🪶</div>
            <h1 className="burned-text">PICKS ARE LIVE!</h1>
            <div className="flame-divider">🔥 🔥 🔥</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TorchRevealAnimation;
