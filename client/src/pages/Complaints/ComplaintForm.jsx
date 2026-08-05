import React, { useState, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Camera, X, MapPin } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const ComplaintForm = ({ onComplaintAdded }) => {
  const { user } = useAuthStore();
  const [messes, setMesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'food',
    mess: '',
  });
  const [image, setImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [coords, setCoords] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch active messes dynamically on mount
  React.useEffect(() => {
    if (user?.collegeId) {
      api.get('/api/messes')
        .then(({ data }) => {
          const list = data.data || [];
          setMesses(list);  
          if (list.length > 0) {
            setFormData(prev => ({ ...prev, mess: list[0]._id }));
          }
        })
        .catch(err => {
          console.error('Failed to load messes', err);
        });
    }
  }, [user]);

  // Separate effect to handle video stream attachment
  React.useEffect(() => {
    if (isCameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(s);
      setIsCameraOpen(true);
    } catch (err) {
      toast.error("Camera access denied or not available");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }

    const tId = toast.loading("Capturing location & photo...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = "Location found";
        
        try {
          // Reverse Geocoding using Nominatim
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            address = geoData.display_name || "Location found";
          }
        } catch (geoErr) {
          console.error("Geocoding failed, using coordinates only:", geoErr);
        }

        try {
          setCoords({ latitude, longitude, address });

          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Split address into wrapped lines using the target font
          const words = address.split(' ');
          const lines = [];
          let currentLine = '';
          ctx.font = 'bold 18px sans-serif';
          
          for (let n = 0; n < words.length; n++) {
            let testLine = currentLine + words[n] + ' ';
            if (ctx.measureText(testLine).width > canvas.width - 40 && n > 0) {
              lines.push(currentLine.trim());
              currentLine = words[n] + ' ';
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine.trim());

          // Calculate heights to prevent overlap
          const lineHeight = 24;
          const addressHeight = lines.length * lineHeight;
          const metaHeight = 20;
          const padding = 15;
          const spacing = 10;
          const barHeight = padding + addressHeight + spacing + metaHeight + padding;

          // Draw the translucent background bar
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

          // Draw Address lines (top-down)
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          let startY = canvas.height - barHeight + padding;
          for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], 20, startY + (i * lineHeight));
          }

          // Draw Coordinates and Time below the address lines
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.font = '14px sans-serif';
          const bottomStr = `LAT: ${latitude.toFixed(6)} | LNG: ${longitude.toFixed(6)} | ${new Date().toLocaleString()}`;
          const metaY = startY + addressHeight + spacing;
          ctx.fillText(bottomStr, 20, metaY);

          canvas.toBlob((blob) => {
            const file = new File([blob], `complaint_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setImage(file);
            stopCamera();
            toast.success("Photo captured with area description!", { id: tId });
          }, 'image/jpeg', 0.9);
        } catch (err) {
          console.error("Canvas draw error:", err);
          toast.error("Failed to capture photo.", { id: tId });
          stopCamera();
        }
      },
      () => {
        toast.error("Location access required for geotagging.", { id: tId });
        stopCamera();
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description);
    payload.append('category', formData.category);
    payload.append('mess', formData.mess);
    if (image) {
      payload.append('image', image);
    }
    if (coords) {
      payload.append('latitude', coords.latitude);
      payload.append('longitude', coords.longitude);
      if (coords.address) {
        payload.append('address', coords.address);
      }
    }

    try {
      const { data } = await api.post('/api/complaints', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.status === 'success') {
        toast.success('Complaint submitted successfully');
        setFormData({ title: '', description: '', category: 'food', mess: messes[0]?._id || '' });
        setImage(null);
        setCoords(null);
        if (onComplaintAdded) onComplaintAdded(data.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  const isBanned = user?.bannedUntil && new Date() < new Date(user.bannedUntil);

  if (isBanned) {
    return (
      <div className="bg-red-50/70 border border-red-200 rounded-[1.5rem] p-6 text-center shadow-sm backdrop-blur-xl mb-6">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <MapPin size={24} className="stroke-[2.5]" />
        </div>
        <h3 className="text-lg font-bold text-red-950 mb-1">Complaint Submissions Suspended</h3>
        <p className="text-red-700/80 text-sm max-w-md mx-auto leading-relaxed">
          Due to your Trust Score dropping to 0% (following repeated rejections), your privileges to submit complaints are temporarily suspended.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 rounded-xl text-xs font-black border border-red-200 uppercase tracking-wide">
          🛡️ Re-enables on: {new Date(user.bannedUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Submit New Complaint</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            rows="3"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Mess</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 mb-4"
              value={formData.mess}
              onChange={(e) => setFormData({ ...formData, mess: e.target.value })}
              required
            >
              {messes.length === 0 ? (
                <option value="">No active messes</option>
              ) : (
                messes.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))
              )}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="food">Food</option>
              <option value="cleanliness">Cleanliness</option>
              <option value="timeliness">Timeliness</option>
              <option value="taste">Taste</option>
              <option value="staff behaviour">Staff Behaviour</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evidence Image</label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  accept=".jpeg,.jpg,.png,.gif,.webp"
                  onChange={(e) => {
                    setImage(e.target.files[0]);
                    setCoords(null); // Reset coords if manual upload
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-900/20 hover:bg-gray-100 transition-all text-sm font-bold text-gray-600"
                >
                  Upload File
                </label>
                <div className="text-gray-300">or</div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-bold shadow-lg shadow-gray-900/20"
                >
                  <Camera size={18} />
                  Take Photo
                </button>
              </div>

              {image && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-100">
                  <img 
                    src={URL.createObjectURL(image)} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button 
                    type="button"
                    onClick={() => { setImage(null); setCoords(null); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black"
                  >
                    <X size={14} />
                  </button>
                  {coords && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] text-white flex items-center gap-1">
                      <MapPin size={10} className="text-teal-400" />
                      Geo-tagged
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isCameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-lg aspect-[3/4] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Camera Controls */}
              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
                >
                  <X size={24} />
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-8 border-white/20"
                >
                  <div className="w-12 h-12 rounded-full border-4 border-gray-900"></div>
                </button>
                <div className="w-14"></div> {/* Spacer to keep capture centered */}
              </div>

              {/* Tips */}
              <div className="absolute top-8 left-0 right-0 flex justify-center">
                <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white/80 text-xs font-bold uppercase tracking-widest border border-white/10">
                  Ensure good lighting
                </div>
              </div>
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading} variant="student">
          {loading ? 'Submitting...' : 'Submit Complaint'}
        </Button>
      </form>
    </div>
  );
};

export default ComplaintForm;
