import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        <HelpCircle className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Page Not Found (404)</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
        The requested lecturer portal page does not exist or has been relocated.
      </p>

      <div className="mt-6">
        <Link to="/dashboard">
          <Button variant="primary" size="md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
