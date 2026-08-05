import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({ label, id, error, type, className = '', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          className={`w-full px-4 py-3 bg-white/50 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/40 focus:border-gray-900/40 focus:bg-white shadow-sm hover:border-gray-400 transition-all duration-300 disabled:bg-gray-100 disabled:text-gray-500 ${isPassword ? 'pr-11' : ''} ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-lg transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default Input;
