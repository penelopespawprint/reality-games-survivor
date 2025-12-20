import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="text-center">
        <h1 className="font-display text-8xl text-tribal-500">404</h1>
        <p className="text-xl text-neutral-300 mt-4">
          This page has been voted off the island.
        </p>
        <Link to="/" className="btn btn-primary mt-8 inline-block">
          Return to Camp
        </Link>
      </div>
    </div>
  );
}
