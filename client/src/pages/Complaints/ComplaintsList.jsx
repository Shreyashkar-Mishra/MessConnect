import React, { useEffect, useState, useCallback } from 'react';
import useAuthStore from '../../store/useAuthStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import ComplaintForm from './ComplaintForm';
import Button from '../../components/ui/Button';
import { AlertCircle, CheckCircle, Clock, XCircle, MessageSquare, RefreshCw, MapPin, ThumbsUp } from 'lucide-react';

const statusConfig = {
  pending:          { label: 'Pending',          color: 'bg-gray-100 text-gray-700 border-gray-200',    icon: Clock },
  assigned:         { label: 'Assigned',         color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: RefreshCw },
  vendor_completed: { label: 'Completed',        color: 'bg-amber-100 text-amber-700 border-amber-200', icon: CheckCircle },
  resolved:         { label: 'Resolved',         color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  rejected:         { label: 'Rejected',         color: 'bg-red-100 text-red-700 border-red-200',       icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${cfg.color}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
};

const ComplaintsList = () => {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messFilter, setMessFilter] = useState('');
  const [messes, setMesses] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (user?.collegeId) {
      api.get('/api/messes')
        .then(({ data }) => {
          setMesses(data.data || []);
        })
        .catch(err => {
          console.error('Failed to load messes', err);
        });
    }
  }, [user]);

  const sortComplaints = (list) => {
    return list.sort((a, b) => {
      const aVotes = a.upvotes?.length || 0;
      const bVotes = b.upvotes?.length || 0;
      if (aVotes !== bVotes) return bVotes - aVotes;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const fetchComplaints = useCallback(async () => {
    try {
      const params = {};
      if (messFilter) params.mess = messFilter;
      const { data } = await api.get('/api/complaints', { params });
      setComplaints(sortComplaints(data.data || data));
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [messFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComplaints();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchComplaints]);

  const handleStatusUpdate = async (id, value) => {
    let status = value;
    let rejectionReason = null;
    if (value.startsWith('rejected:')) {
      const parts = value.split(':');
      status = parts[0];
      rejectionReason = parts[1];
    }
    try {
      await api.patch(`/api/complaints/${id}/status`, { status, rejectionReason });
      toast.success('Status updated');
      fetchComplaints();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error updating status');
    }
  };

  const handleUpvote = async (id) => {
    if (user?.role !== 'student') return;
    try {
      await api.post(`/api/complaints/${id}/upvote`);
      toast.success('Me Too! Vote recorded.');
      setComplaints(prev => {
         const newList = prev.map(c => {
             if (c._id === id) {
                 const votes = c.upvotes || [];
                 const hasVoted = votes.includes(user._id);
                 return { ...c, upvotes: hasVoted ? votes.filter(v => v !== user._id) : [...votes, user._id] };
             }
             return c;
         });
         return sortComplaints(newList);
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to record vote');
    }
  };

  const handleVendorComplete = async (id) => {
    try {
      await api.patch(`/api/complaints/${id}/vendor-complete`);
      toast.success('Marked as completed!');
      fetchComplaints();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const roleGradients = {
    student: 'from-blue-600 via-indigo-600 to-violet-600',
    mess_committee: 'from-amber-600 via-orange-500 to-amber-600',
    vendor: 'from-rose-600 via-pink-600 to-rose-600',
    college_admin: 'from-indigo-600 via-violet-600 to-purple-600',
    admin: 'from-indigo-600 via-violet-600 to-purple-600',
    super_admin: 'from-violet-700 via-purple-600 to-indigo-700',
  };
  const gradient = roleGradients[user?.role] || roleGradients.student;

  return (
    <div className="space-y-6 pb-8">
      {/* Premium Header */}
      <div className={`relative overflow-hidden rounded-[2rem] p-8 bg-gradient-to-r ${gradient} text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)]`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 blur-3xl rounded-full"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <MessageSquare size={20} />
              </div>
              <span className="text-white/70 text-sm font-bold uppercase tracking-widest">Module</span>
            </div>
            <h1 className="text-3xl font-black mb-1">Complaints</h1>
            <p className="text-white/70 font-medium">
              {user?.role === 'student' ? 'Submit and track your mess complaints' : 'Review and manage all incoming complaints'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {['student', 'mess_committee', 'college_admin', 'super_admin'].includes(user?.role) && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30 truncate">
                <select 
                  className="bg-transparent text-white font-bold outline-none cursor-pointer text-sm"
                  value={messFilter}
                  onChange={(e) => setMessFilter(e.target.value)}
                >
                  <option value="" className="text-gray-900">All Messes</option>
                  {messes.map((m) => (
                    <option key={m._id} value={m._id} className="text-gray-900">{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="text-right">
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Total</p>
              <p className="text-3xl font-black">{complaints.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Complaint Form */}
      {user?.role === 'student' && (
        <ComplaintForm onComplaintAdded={(newCmp) => setComplaints(prev => sortComplaints([newCmp, ...prev]))} />
      )}

      {/* Complaints List */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Loading complaints...</p>
          </div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center p-16 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/50">
          <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-gray-400" size={28} />
          </div>
          <h3 className="font-bold text-gray-700 mb-1">No complaints yet</h3>
          <p className="text-gray-400 text-sm">
            {user?.role === 'student' ? 'Use the form above to submit a complaint' : 'No complaints have been submitted yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map(complaint => (
            <div key={complaint._id} className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[1.5rem] p-6 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{complaint.title}</h3>
                    <StatusBadge status={complaint.status} />
                    {complaint.status === 'rejected' && complaint.rejectionReason && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold text-red-600 bg-red-50 rounded-full border border-red-200">
                        Reason: {complaint.rejectionReason.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-full border border-gray-200 capitalize">
                      {complaint.category}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200">
                      🏛️ {complaint.mess?.name || messes.find(m => m._id === complaint.mess)?.name || 'Mess'}
                    </span>
                    <div className="ml-auto">
                      <button
                        onClick={() => handleUpvote(complaint._id)}
                        disabled={user?.role !== 'student' || complaint.status !== 'pending'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold transition-all ${
                          complaint.upvotes?.includes(user?._id)
                            ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-inner hover:bg-amber-50 hover:border-amber-400'
                            : user?.role === 'student' && complaint.status === 'pending'
                              ? 'bg-white border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-600'
                              : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed opacity-80'
                        }`}
                        title={user?.role === 'student' ? (complaint.upvotes?.includes(user?._id) ? "Click to remove your vote" : "I'm experiencing this too") : `${complaint.upvotes?.length || 0} students experiencing this`}
                      >
                        <ThumbsUp size={14} className={complaint.upvotes?.includes(user?._id) ? "fill-amber-500 text-amber-500" : ""} />
                        {complaint.upvotes?.length || 0}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{complaint.description}</p>
                  {complaint.image && (
                    <div 
                      onClick={() => setSelectedPhoto({
                        url: `http://localhost:5000/uploads/${complaint.image.split('\\').pop().split('/').pop()}`,
                        title: complaint.title,
                        description: complaint.description,
                        address: complaint.location?.address || (complaint.location?.latitude ? `${complaint.location.latitude.toFixed(4)}, ${complaint.location.longitude.toFixed(4)}` : null)
                      })}
                      className="relative w-32 h-32 mt-3 group cursor-pointer overflow-hidden rounded-xl border border-gray-200 shadow-sm hover:border-teal-300 hover:shadow-md transition-all duration-200"
                      title="Click to view full image"
                    >
                      <img
                        src={`http://localhost:5000/uploads/${complaint.image.split('\\').pop().split('/').pop()}`}
                        alt="Proof"
                        className="h-full w-full object-cover group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-200" />
                      {complaint.location?.latitude && (
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/65 backdrop-blur-md rounded-md text-[9px] text-white flex items-center gap-0.5 font-bold">
                          <MapPin size={8} className="text-teal-400" />
                          Geo-tagged
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-100/50">
                    <p className="text-xs text-gray-400 font-medium flex items-center gap-2 flex-wrap">
                      <span>Submitted {new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {complaint.user_id?.name && (
                        <span className="flex items-center gap-1.5">
                          <span>· by {complaint.user_id.name}</span>
                          {complaint.user_id.role === 'student' && typeof complaint.user_id.trustMeter === 'number' && (
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              complaint.user_id.trustMeter >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                              complaint.user_id.trustMeter >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`} title="Student Trust Score">
                              🛡️ {complaint.user_id.trustMeter}% Trust
                            </span>
                          )}
                        </span>
                      )}
                    </p>
                    {complaint.location?.latitude && (
                      <div className="flex items-center gap-1 text-teal-600 bg-teal-50/60 px-2.5 py-1 rounded-xl border border-teal-100/70 w-fit max-w-full">
                        <MapPin size={12} className="flex-shrink-0 text-teal-500" />
                        <span className="text-xs truncate font-medium" title={complaint.location.address}>
                          {complaint.location.address || `${complaint.location.latitude.toFixed(4)}, ${complaint.location.longitude.toFixed(4)}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[180px]">
                  {/* Committee Actions */}
                  {user?.role === 'mess_committee' && !['resolved', 'rejected'].includes(complaint.status) && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Update Status</label>
                      <select
                        className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium cursor-pointer"
                        value={complaint.status}
                        onChange={(e) => handleStatusUpdate(complaint._id, e.target.value)}
                      >
                        {complaint.status === 'pending' && (
                          <>
                            <option value="pending">⏳ Pending</option>
                            <option value="assigned">🔁 Assign to Vendor</option>
                            <option disabled className="text-gray-400 font-bold bg-gray-50">❌ Reject Reason:</option>
                            <option value="rejected:duplicate">❌ Reject (Duplicate - 0)</option>
                            <option value="rejected:wrong_category">❌ Reject (Wrong Category - -2)</option>
                            <option value="rejected:spam">❌ Reject (Spam - -10)</option>
                            <option value="rejected:false_information">❌ Reject (False Info - -15)</option>
                            <option value="rejected:inappropriate">❌ Reject (Inappropriate - -10)</option>
                          </>
                        )}
                        {complaint.status === 'assigned' && (
                          <>
                            <option value="assigned">🔁 Assigned to Vendor</option>
                            <option disabled className="text-gray-400 font-bold bg-gray-50">❌ Reject Reason:</option>
                            <option value="rejected:duplicate">❌ Reject (Duplicate - 0)</option>
                            <option value="rejected:wrong_category">❌ Reject (Wrong Category - -2)</option>
                            <option value="rejected:spam">❌ Reject (Spam - -10)</option>
                            <option value="rejected:false_information">❌ Reject (False Info - -15)</option>
                            <option value="rejected:inappropriate">❌ Reject (Inappropriate - -10)</option>
                          </>
                        )}
                        {complaint.status === 'vendor_completed' && (
                          <>
                            <option value="assigned">🔁 Re-assign to Vendor</option>
                            <option value="resolved">✅ Resolve</option>
                          </>
                        )}
                      </select>
                      {complaint.status === 'vendor_completed' && (
                        <div className="text-xs text-center text-amber-600 bg-amber-50 rounded-xl px-3 py-2 font-bold border border-amber-200">
                          Vendor marked complete — awaiting your review
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vendor Actions */}
                  {user?.role === 'vendor' && complaint.status === 'assigned' && (
                    <Button variant="vendor" onClick={() => handleVendorComplete(complaint._id)} className="text-xs">
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Photo Viewer Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all duration-300"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-6 right-6 p-2 text-white/70 bg-white/10 hover:bg-white/20 hover:text-white rounded-full transition-all duration-200"
            title="Close viewer"
          >
            <XCircle size={32} />
          </button>
          <div 
            className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex flex-col bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedPhoto.url} 
              alt={selectedPhoto.title || "Evidence"} 
              className="w-full h-auto max-h-[70vh] object-contain"
            />
            <div className="p-5 bg-gray-900/90 border-t border-white/10 text-white">
              <h4 className="text-lg font-bold mb-1">{selectedPhoto.title}</h4>
              <p className="text-sm text-gray-400 mb-2">{selectedPhoto.description}</p>
              {selectedPhoto.address && (
                <div className="flex items-center gap-1.5 text-xs text-teal-400 bg-teal-950/40 px-3 py-1.5 rounded-xl border border-teal-900/50 w-fit">
                  <MapPin size={12} className="text-teal-400" />
                  <span>{selectedPhoto.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsList;
