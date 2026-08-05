import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const Signup = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [messes, setMesses] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phoneNumber: '',
    companyName: '',
    messAssigned: '',
    collegeSlug: '',
    otp: ''
  });

  useEffect(() => {
    api.get('/api/auth/colleges')
      .then(({ data }) => {
        setColleges(data.data || []);
      })
      .catch(() => {
        toast.error('Failed to load colleges');
      });
  }, []);

  useEffect(() => {
    if (formData.role === 'vendor' && formData.collegeSlug) {
      const selectedCollege = colleges.find(c => c.slug === formData.collegeSlug);
      if (selectedCollege) {
        api.get(`/api/auth/messes?collegeId=${selectedCollege._id}`)
          .then(({ data }) => {
            setTimeout(() => setMesses(data.data || []), 0);
          })
          .catch(() => {
            setTimeout(() => setMesses([]), 0);
          });
      }
    } else {
      setTimeout(() => setMesses([]), 0);
    }
  }, [formData.role, formData.collegeSlug, colleges]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phoneNumber') {
      const sanitized = value.replace(/\D/g, '');
      if (sanitized.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: sanitized }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.email && !formData.phoneNumber) {
      toast.error('Please provide an email or phone number');
      return;
    }

    if (formData.name.trim().length < 3) {
      toast.error("Full Name must be at least 3 characters long.");
      return;
    }

    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    const upperCaseRegex = /[A-Z]/;
    const lowerCaseRegex = /[a-z]/;

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (!upperCaseRegex.test(formData.password)) {
      toast.error("Password must contain at least one uppercase letter (A-Z).");
      return;
    }
    if (!lowerCaseRegex.test(formData.password)) {
      toast.error("Password must contain at least one lowercase letter (a-z).");
      return;
    }
    if (!specialCharRegex.test(formData.password)) {
      toast.error("Password must contain at least one special character (e.g. !@#$%^&*).");
      return;
    }

    if (formData.phoneNumber.length !== 10) {
      toast.error("Phone number must be exactly 10 digits long.");
      return;
    }

    // Validate email domain matches college allowedDomains for students/committee
    if (formData.role === 'student' || formData.role === 'mess_committee') {
      const emailParts = formData.email.split('@');
      if (emailParts.length !== 2) {
        toast.error("Please enter a valid email address.");
        return;
      }
      const emailDomain = emailParts[1].toLowerCase();
      const isDomainRegistered = colleges.some(college =>
        college.allowedDomains && college.allowedDomains.map(d => d.toLowerCase()).includes(emailDomain)
      );

      if (!isDomainRegistered) {
        toast.error(`Your email domain (${emailDomain}) is not registered with any college.`);
        return;
      }
    }

    // Validate vendor specific fields before sending OTP
    if (formData.role === 'vendor') {
      if (!formData.collegeSlug) {
        toast.error("Please select a college.");
        return;
      }
      if (!formData.companyName.trim()) {
        toast.error("Please enter your registered company name.");
        return;
      }
      if (!formData.messAssigned) {
        toast.error("Please select an assigned mess.");
        return;
      }
    }

    setSendingOtp(true);
    try {
      const { data } = await api.post('/api/auth/send-otp', {
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        collegeSlug: formData.collegeSlug,
        messAssigned: formData.messAssigned
      });
      if (data.status === 'success') {
        toast.success('OTP sent successfully!');
        setOtpStep(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Send the entire form to standard signup which now requires 'otp'
      const submitData = { ...formData };

      const { data } = await api.post('/api/auth/signup', submitData);
      if (data.user || data.data) { // Depending on the actual response envelope
        const payload = data.data || data;
        setAuth(payload.user || data.user, payload.token || data.token || null);
        toast.success('Account verified and created seamlessly!');
        navigate(`/login`); // Or navigate to dashboard if token exists
      } else {
        toast.success('Account created, please refresh or log in.');
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong during signup');
    } finally {
      setLoading(false);
    }
  };

  const roleThemes = {
    student: 'bg-teal-500/10 border-teal-200 shadow-teal-500/5',
    vendor: 'bg-coral-500/10 border-coral-200 shadow-rose-500/5',
    mess_committee: 'bg-amber-500/10 border-amber-200 shadow-amber-500/5'
  };

  return (
    <div className="min-h-screen auth-gradient flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-xl shadow-gray-900/20">
            <span className="text-white font-black text-3xl">M</span>
          </div>
        </div>
        <h2 className="mt-2 text-center text-4xl font-black tracking-tight text-gray-900">Get started</h2>
        <p className="mt-3 text-center text-sm font-medium text-gray-500">
          Already a member?{' '}
          <Link to="/login" className="font-bold text-teal-600 hover:text-teal-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="glass-panel py-10 px-6 shadow-2xl shadow-gray-400/20 sm:rounded-3xl sm:px-12 border border-white/60">

          {!otpStep ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <Input label="Full Name" name="name" required value={formData.name} onChange={handleChange} />
                  <p className="text-[10px] text-gray-400 font-semibold px-1">At least 3 characters</p>
                </div>
                <div className="space-y-1">
                  <Input label="Email address" type="email" name="email" required value={formData.email} onChange={handleChange} />
                  <p className="text-[10px] text-gray-400 font-semibold px-1">Institutional email address</p>
                </div>
                <div className="space-y-1">
                  <Input label="Password" type="password" name="password" required value={formData.password} onChange={handleChange} />
                  <p className="text-[10px] text-gray-400 font-semibold px-1 leading-normal">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 special char
                  </p>
                </div>
                <div className="space-y-1">
                  <Input label="Phone Number" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} />
                  <p className="text-[10px] text-gray-400 font-semibold px-1">At least 10 digits</p>
                </div>

                <div className="w-full md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">I am registering as</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['student', 'vendor', 'mess_committee'].map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role, collegeSlug: '', messAssigned: '' })}
                        className={`py-2 px-3 text-sm font-bold rounded-xl border transition-all ${formData.role === role ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                        {role === 'mess_committee' ? 'Committee' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {formData.role !== 'student' && (
                <div className={`mt-6 p-6 rounded-2xl border backdrop-blur-sm transition-colors duration-300 ${roleThemes[formData.role]}`}>

                {formData.role === 'vendor' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select College</label>
                      <select
                        name="collegeSlug"
                        required
                        value={formData.collegeSlug}
                        onChange={(e) => {
                          const slug = e.target.value;
                          setFormData({ ...formData, collegeSlug: slug, messAssigned: '' });
                        }}
                        className="w-full px-3 py-2 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-500"
                      >
                        <option value="">Select College</option>
                        {colleges.map(c => (
                          <option key={c._id} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <Input label="Registered Company Name" name="companyName" required value={formData.companyName} onChange={handleChange} />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Mess</label>
                      <select
                        name="messAssigned"
                        required
                        value={formData.messAssigned}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-500"
                        disabled={!formData.collegeSlug}
                      >
                        <option value="">{formData.collegeSlug ? 'Select Mess' : 'Select a college first'}</option>
                        {messes.map(m => (
                          <option key={m._id} value={m._id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-white/40 rounded-lg text-sm text-rose-800 font-bold border border-rose-200">
                      Vendor accounts will require administrative review and verification before login is permitted.
                    </div>
                  </div>
                )}

                {formData.role === 'mess_committee' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-3 bg-white/40 rounded-lg text-sm text-amber-800 font-bold border border-amber-200">
                      Committee accounts will require administrative review and verification before login is permitted.
                    </div>
                  </div>
                )}
                </div>
              )}

              <Button type="submit" className="w-full mt-4" disabled={sendingOtp} variant="primary">
                {sendingOtp ? 'Sending OTP...' : 'Continue to Verification'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-6 animate-fade-in">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">OTP Sent!</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Please check your email/phone for the 6-digit code.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <label className="block text-sm font-bold text-gray-700 mb-2">Enter 6-digit OTP</label>
                <input
                  name="otp"
                  type="text"
                  maxLength="6"
                  required
                  className="w-48 px-4 py-3 text-center tracking-[0.5em] text-2xl h-14 bg-white/80 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-black shadow-inner transition-all"
                  value={formData.otp}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <Button type="submit" disabled={loading} variant="primary" className="w-full">
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
                <button type="button" onClick={() => setOtpStep(false)} className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">
                  Go back and edit details
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Signup;
