import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', formData);
      if (data.user || data.status === 'success') {
        const payloadUser = data.user || data.data?.user;
        const payloadToken = data.token || data.data?.token;
        setAuth(payloadUser, payloadToken);
        const role = payloadUser?.role;
        toast.success(`Welcome back, ${payloadUser?.name || ''}!`);
        navigate(`/dashboard/${role}`);
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden relative" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      {/* Left Panel – Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex-col justify-center gap-20 p-12">
        {/* Ambient blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px]"></div>
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img src="/darkbg.png" alt="MessConnect Logo" className="w-12 h-12 flex-shrink-0 object-cover rounded-xl shadow-lg ring-1 ring-white/20" />
          <span className="text-white font-bold text-xl tracking-tight">MessConnect</span>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10">
          <div className="inline-flex items-center px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 rounded-full text-teal-400 text-xs font-bold uppercase tracking-widest mb-6">
            Institution Mess Management
          </div>
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            We care<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400">for your food.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">
            From daily meal tracking to real-time complaint resolution
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[['Students', 'Submit feedback & track complaints'], ['Committee', 'Manage operations & notices'], ['Vendors', 'Update menus & resolve tasks']].map(([role, desc]) => (
              <div key={role} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-white font-bold text-sm mb-1">{role}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        

      </div>
      
      {/* Right Panel – Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative" style={{background: 'radial-gradient(at 20% 80%, hsla(189,100%,60%,0.08) 0px, transparent 60%), radial-gradient(at 80% 20%, hsla(28,100%,74%,0.1) 0px, transparent 60%), #fafafa'}}>
        {/* Mobile logo */}
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
          <img src="/lightbg.png" alt="MessConnect Logo" className="w-9 h-9 flex-shrink-0 object-cover rounded-lg shadow-sm ring-1 ring-gray-200" />
          <span className="text-gray-900 font-bold">MessConnect</span>
        </div>
        
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Sign in</h2>
            <p className="text-gray-500">
              New to MessConnect?{' '}
              <Link to="/signup" className="font-bold text-teal-600 hover:text-teal-500 transition-colors">
                Create account →
              </Link>
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email address"
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Password"
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-bold text-teal-600 hover:text-teal-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" className="w-full mt-2 py-3.5 text-base" disabled={loading} variant="primary">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Authenticating...
                  </span>
                ) : 'Sign In'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

