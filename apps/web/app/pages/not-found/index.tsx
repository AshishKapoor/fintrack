import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-600 mb-6">
        Page Not Found
      </h2>
      <p className="text-gray-500 mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-primary text-white rounded-md transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
