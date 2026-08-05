import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, FileText, UserCheck, Users, Building2 } from 'lucide-react';
import Button from '../../components/ui/Button';

const UserApprovals = () => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [messes, setMesses] = useState([]);
  const [staffMessFilter, setStaffMessFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [denyingUser, setDenyingUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [denying, setDenying] = useState(false);

  useEffect(() => {
    api.get('/api/messes')
      .then(({ data }) => setMesses(data.data || []))
      .catch(err => console.error('Failed to load messes', err));
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const [userRes, staffRes] = await Promise.all([
        api.get('/api/admin/pending-users'),
        api.get('/api/admin/pending-staff')
      ]);
      setUsers(userRes.data.data || []);
      setStaff(staffRes.data.data || []);
    } catch {
      toast.error('Failed to fetch pending approval requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPending();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPending]);

  const filteredStaff = staff.filter(member => {
    if (!staffMessFilter) return true;
    const messId = member.mess?._id || member.mess;
    return messId === staffMessFilter;
  });

  const handleApproveUser = async (id) => {
    try {
      await api.patch(`/api/admin/approve-user/${id}`);
      toast.success('User approved successfully!');
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve user');
    }
  };

  const handleApproveStaff = async (id) => {
    try {
      await api.patch(`/api/admin/approve-staff/${id}`);
      toast.success('Staff member approved!');
      setStaff(staff.filter(s => s._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve staff member');
    }
  };

  const handleDenyStaff = async (id) => {
    if (!window.confirm('Reject and remove this staff member request?')) return;
    try {
      await api.delete(`/api/admin/deny-staff/${id}`);
      toast.success('Staff member request denied and removed');
      setStaff(staff.filter(s => s._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deny staff member');
    }
  };

  const handleDenyUser = async () => {
    if (!denyingUser) return;
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    setDenying(true);
    try {
      await api.post(`/api/admin/deny-user/${denyingUser._id}`, { reason: rejectionReason });
      toast.success('User registration request denied');
      setUsers(users.filter(u => u._id !== denyingUser._id));
      setDenyingUser(null);
      setRejectionReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deny user');
    } finally {
      setDenying(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in pb-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Verification Queue</h1>
            <p className="text-sm text-gray-500 font-medium">Audit uploaded compliance documents and approve registrations</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {activeTab === 'staff' && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm">
                <Building2 size={16} className="text-gray-500" />
                <select
                  value={staffMessFilter}
                  onChange={(e) => setStaffMessFilter(e.target.value)}
                  className="bg-transparent text-gray-900 font-bold outline-none cursor-pointer text-xs"
                >
                  <option value="">All Messes</option>
                  {messes.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'accounts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <UserCheck size={16} /> Vendor & Committee ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <Users size={16} /> Mess Staff Members ({filteredStaff.length})
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'accounts' ? (
          <div className="glass-panel overflow-hidden border border-white/40 shadow-xl shadow-gray-200/40 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-4 text-sm font-bold text-gray-600">Applicant Details</th>
                    <th className="p-4 text-sm font-bold text-gray-600">Role & Mess</th>
                    <th className="p-4 text-sm font-bold text-gray-600">Compliance Documents</th>
                    <th className="p-4 text-sm font-bold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading pending requests...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">No pending vendor or committee requests. All caught up!</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-white/60 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email} • {user.phoneNumber}</p>
                          {user.companyName && <p className="text-xs font-bold text-teal-700 mt-1">{user.companyName}</p>}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${user.role === 'vendor' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </span>
                          {user.messAssigned?.name && (
                            <p className="text-xs text-gray-500 font-medium mt-1">Mess: {user.messAssigned.name}</p>
                          )}
                        </td>
                        <td className="p-4">
                          {user.vendorDocuments ? (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {user.vendorDocuments.udyamCertificate && (
                                <a href={user.vendorDocuments.udyamCertificate} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> Udyam
                                </a>
                              )}
                              {user.vendorDocuments.fssaiLicense && (
                                <a href={user.vendorDocuments.fssaiLicense} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> FSSAI
                                </a>
                              )}
                              {user.vendorDocuments.labourLicense && (
                                <a href={user.vendorDocuments.labourLicense} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> Labour
                                </a>
                              )}
                              {user.vendorDocuments.gstCertificate && (
                                <a href={user.vendorDocuments.gstCertificate} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> GST
                                </a>
                              )}
                              {user.vendorDocuments.panCard && (
                                <a href={user.vendorDocuments.panCard} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> PAN
                                </a>
                              )}
                              {user.vendorDocuments.aadhaarCard && (
                                <a href={user.vendorDocuments.aadhaarCard} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> Aadhaar
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => handleApproveUser(user._id)} variant="primary" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                              <CheckCircle size={14} className="mr-1 inline" /> Approve
                            </Button>
                            <Button onClick={() => setDenyingUser(user)} variant="danger" className="text-xs">
                              <XCircle size={14} className="mr-1 inline" /> Deny
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden border border-white/40 shadow-xl shadow-gray-200/40 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="p-4 text-sm font-bold text-gray-600">Staff Member</th>
                    <th className="p-4 text-sm font-bold text-gray-600">Vendor & Mess</th>
                    <th className="p-4 text-sm font-bold text-gray-600">Verification Documents</th>
                    <th className="p-4 text-sm font-bold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading staff verification queue...</td></tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-500">No pending staff members found for the selected mess.</td></tr>
                  ) : (
                    filteredStaff.map((member) => (
                      <tr key={member._id} className="hover:bg-white/60 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.phoneNumber} • Role: <strong className="text-gray-700">{member.role}</strong></p>
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-bold text-gray-900">{member.vendor?.companyName || member.vendor?.name}</p>
                          <p className="text-xs text-gray-500 font-medium">Mess: {member.mess?.name || 'N/A'}</p>
                        </td>
                        <td className="p-4">
                          {member.documents ? (
                            <div className="flex flex-wrap gap-1.5">
                              {member.documents.identityProof && (
                                <a href={member.documents.identityProof} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> Identity
                                </a>
                              )}
                              {member.documents.policeVerification && (
                                <a href={member.documents.policeVerification} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> Police Report
                                </a>
                              )}
                              {member.documents.medicalReport && (
                                <a href={member.documents.medicalReport} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded border border-gray-200 inline-flex items-center gap-1">
                                  <FileText size={10} /> Medical
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">No documents</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => handleApproveStaff(member._id)} variant="primary" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                              <CheckCircle size={14} className="mr-1 inline" /> Approve Staff
                            </Button>
                            <Button onClick={() => handleDenyStaff(member._id)} variant="danger" className="text-xs">
                              <XCircle size={14} className="mr-1 inline" /> Deny
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {denyingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/40 relative">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Deny Registration Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to deny the registration request for <strong className="text-gray-900">{denyingUser.name}</strong> ({denyingUser.email})?
            </p>
            
            <div className="space-y-2 mb-6">
              <label className="block text-sm font-semibold text-gray-700">Reason for Denial</label>
              <textarea
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-gray-50 focus:bg-white text-sm transition-all resize-none"
                placeholder="Enter the reason for denial (this will be emailed)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setDenyingUser(null);
                  setRejectionReason('');
                }}
                disabled={denying}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDenyUser}
                disabled={denying || !rejectionReason.trim()}
              >
                {denying ? 'Denying...' : 'Send & Deny'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserApprovals;
