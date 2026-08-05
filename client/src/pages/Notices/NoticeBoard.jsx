import React, { useEffect, useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Bell, Plus, X, Trash2 } from 'lucide-react';

const NoticeBoard = () => {
  const { user } = useAuthStore();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', targetRole: 'all', isActive: true, expiresAt: '' });

  const fetchNotices = async () => {
    try {
      const { data } = await api.get('/api/notices');
      setNotices(data.data || data);
    } catch { toast.error('Failed to load notices'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotices();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const payload = new FormData();
    payload.append('title', formData.title);
    if (formData.description) payload.append('description', formData.description);
    payload.append('targetRole', formData.targetRole);
    payload.append('isActive', formData.isActive.toString());
    if (formData.expiresAt) payload.append('expiresAt', formData.expiresAt);
    if (image) payload.append('image', image);
    try {
      const { data } = await api.post('/api/notices', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.status === 'success') {
        toast.success('Notice published!');
        setNotices([data.data, ...notices]);
        setShowForm(false);
        setFormData({ title: '', description: '', targetRole: 'all', isActive: true, expiresAt: '' });
        setImage(null);
      }
    } catch { toast.error('Failed to create notice'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await api.delete(`/api/notices/${id}`);
      setNotices(notices.filter(n => n._id !== id));
      toast.success('Notice deleted');
    } catch { toast.error('Failed to delete notice'); }
  };

  const targetRoleColor = { all: 'bg-gray-100 text-gray-700', student: 'bg-teal-100 text-teal-700', vendor: 'bg-rose-100 text-rose-700', mess_committee: 'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-6 pb-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2rem] p-8 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-700 text-white shadow-[0_20px_50px_-12px_rgba(139,92,246,0.3)]">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 blur-3xl rounded-full"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <Bell size={20} />
              </div>
              <span className="text-white/70 text-sm font-bold uppercase tracking-widest">Announcements</span>
            </div>
            <h1 className="text-3xl font-black mb-1">Notice Board</h1>
            <p className="text-white/70 font-medium">Stay updated with important institutional announcements</p>
          </div>
          {['mess_committee', 'college_admin'].includes(user?.role) && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl text-white font-bold text-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5"
            >
              {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Notice</>}
            </button>
          )}
        </div>
      </div>

      {/* Create Notice Form */}
      {showForm && ['mess_committee', 'college_admin'].includes(user?.role) && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] animate-fade-in">
          <h3 className="text-xl font-black text-gray-900 mb-6">New Announcement</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <Input label="Expiration Date" type="date" value={formData.expiresAt} onChange={e => setFormData({...formData, expiresAt: e.target.value})} />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Target Audience</label>
                <select className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/40" value={formData.targetRole} onChange={e => setFormData({...formData, targetRole: e.target.value})}>
                  <option value="all">Everyone</option>
                  <option value="student">Students</option>
                  <option value="vendor">Vendor</option>
                  <option value="mess_committee">Committee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Image Attachment</label>
                <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
              <textarea className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/40" rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <Button type="submit" variant="committee" disabled={formLoading}>
              {formLoading ? 'Publishing...' : '→ Publish Notice'}
            </Button>
          </form>
        </div>
      )}

      {/* Notices Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-10 h-10 border-2 border-gray-300 border-t-violet-600 rounded-full animate-spin"></div>
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center p-16 bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/50">
          <div className="w-16 h-16 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Bell className="text-violet-400" size={28} />
          </div>
          <h3 className="font-bold text-gray-700 mb-1">No notices yet</h3>
          <p className="text-gray-400 text-sm">Important announcements will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map(notice => (
            <div key={notice._id} className={`bg-white/70 backdrop-blur-xl border border-white/60 rounded-[1.5rem] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 ${!notice.isActive ? 'opacity-60' : ''}`}>
              <div className="flex flex-col sm:flex-row gap-0">
                {notice.image && (
                  <div className="sm:w-48 flex-shrink-0">
                    <img src={`http://localhost:5000/uploads/${notice.image.split('\\').pop().split('/').pop()}`} alt="Notice" className="w-full h-48 sm:h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-gray-900">{notice.title}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${targetRoleColor[notice.targetRole] || targetRoleColor.all}`}>
                        {notice.targetRole.toUpperCase()}
                      </span>
                      {!notice.isActive && <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-500">INACTIVE</span>}
                    </div>
                    {['mess_committee', 'college_admin'].includes(user?.role) && (
                      <button onClick={() => handleDelete(notice._id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{notice.description}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 font-medium">
                    {notice.createdBy?.name && <span>By {notice.createdBy.name}</span>}
                    {notice.expiresAt && <span>Expires {new Date(notice.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default NoticeBoard;
