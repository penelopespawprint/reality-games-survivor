/**
 * TorchLoader Component
 *
 * Animated torch loading indicator matching the RGFL logo.
 * Uses CSS animations to create a realistic flickering flame effect.
 */

import React from 'react';
import './TorchLoader.css';

interface TorchLoaderProps {
  /** Optional loading message */
  message?: string;
  /** Size: 'small' (40px), 'medium' (80px), 'large' (120px) */
  size?: 'small' | 'medium' | 'large';
  /** Show the full-page overlay loader */
  fullPage?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Animated torch loading indicator
 */
export function TorchLoader({
  message,
  size = 'medium',
  fullPage = false,
  className = '',
}: TorchLoaderProps) {
  const torchElement = (
    <div className={`torch-loader torch-loader--${size} ${className}`} role="status" aria-label={message || 'Loading'}>
      <div className="torch-loader__torch">
        {/* Torch handle */}
        <div className="torch-loader__handle">
          <div className="torch-loader__handle-wrap" />
        </div>

        {/* Flame container */}
        <div className="torch-loader__flame-container">
          {/* Glow effect behind flame */}
          <div className="torch-loader__glow" />

          {/* Main flame layers */}
          <div className="torch-loader__flame torch-loader__flame--outer" />
          <div className="torch-loader__flame torch-loader__flame--middle" />
          <div className="torch-loader__flame torch-loader__flame--inner" />

          {/* Sparks */}
          <div className="torch-loader__spark torch-loader__spark--1" />
          <div className="torch-loader__spark torch-loader__spark--2" />
          <div className="torch-loader__spark torch-loader__spark--3" />
        </div>
      </div>

      {message && <p className="torch-loader__message">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="torch-loader__overlay">
        {torchElement}
      </div>
    );
  }

  return torchElement;
}

/** Jeff Probst's famous catchphrases for loading states */
const JEFF_PHRASES = [
  "Come on in!",
  "Worth playing for?",
  "Dig deep!",
  "You gotta dig!",
  "Survivors ready?",
  "Want to know what you're playing for?",
  "I got nothin' for ya.",
  "Once again, immunity is back up for grabs.",
];

/** Get a random Jeff catchphrase */
function getRandomPhrase(): string {
  return JEFF_PHRASES[Math.floor(Math.random() * JEFF_PHRASES.length)];
}

/**
 * Full page loading state with torch
 */
export function PageLoader({ message }: { message?: string }) {
  return <TorchLoader fullPage size="large" message={message || getRandomPhrase()} />;
}

/**
 * Inline loading state for smaller areas
 */
export function InlineLoader({ message }: { message?: string }) {
  return <TorchLoader size="small" message={message} />;
}

/**
 * Section loading state
 */
export function SectionLoader({ message }: { message?: string }) {
  return (
    <div className="torch-loader__section">
      <TorchLoader size="medium" message={message || getRandomPhrase()} />
    </div>
  );
}

export default TorchLoader;
