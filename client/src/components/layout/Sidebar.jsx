import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { LayoutDashboard, MessageSquare, Star, Bell, Users, Calendar, LogOut, ShieldCheck, X, Menu, School } from 'lucide-react';

const roleColors = {
  student:        { pill: 'bg-teal-500/10 text-teal-700 border-teal-200',    dot: 'bg-teal-500',    active: 'from-teal-600 to-emerald-600' },
  mess_committee: { pill: 'bg-amber-500/10 text-amber-700 border-amber-200', dot: 'bg-amber-500',   active: 'from-amber-500 to-orange-500' },
  vendor:         { pill: 'bg-rose-500/10 text-rose-700 border-rose-200',    dot: 'bg-rose-500',    active: 'from-rose-600 to-pink-600' },
  college_admin:  { pill: 'bg-indigo-500/10 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', active: 'from-indigo-600 to-violet-600' },
  super_admin:    { pill: 'bg-violet-500/10 text-violet-700 border-violet-200', dot: 'bg-violet-500', active: 'from-violet-700 to-purple-600' },
};

const getLinks = (role) => {
  const base = [{ name: 'Dashboard', path: `/dashboard/${role}`, icon: LayoutDashboard }];
  if (role === 'student') {
    base.push(
      { name: 'Complaints', path: '/complaints', icon: MessageSquare },
      { name: 'Feedback', path: '/feedback', icon: Star },
      { name: 'Notices', path: '/notices', icon: Bell },
      { name: 'Timetable', path: '/timetable', icon: Calendar }
    );
  } else if (role === 'vendor') {
    base.push(
      { name: 'Complaints', path: '/complaints', icon: MessageSquare },
      { name: 'Feedback', path: '/feedback', icon: Star },
      { name: 'Notices', path: '/notices', icon: Bell },
      { name: 'Staff', path: '/staff', icon: Users },
      { name: 'Timetable', path: '/timetable', icon: Calendar }
    );
  } else if (role === 'mess_committee') {
    base.push(
      { name: 'Complaints', path: '/complaints', icon: MessageSquare },
      { name: 'Feedback', path: '/feedback', icon: Star },
      { name: 'Notices', path: '/notices', icon: Bell },
      { name: 'Staff', path: '/staff', icon: Users },
      { name: 'Timetable', path: '/timetable', icon: Calendar }
    );
  } else if (role === 'college_admin') {
    base.push(
      { name: 'User Approvals', path: '/approvals', icon: ShieldCheck },
      { name: 'Manage Messes', path: '/messes', icon: School },
      { name: 'Staff', path: '/staff', icon: Users },
      { name: 'Complaints', path: '/complaints', icon: MessageSquare },
      { name: 'Notices', path: '/notices', icon: Bell },
      { name: 'Feedback', path: '/feedback', icon: Star }
    );
  } else if (role === 'super_admin') {
    base.push(
      { name: 'Manage Colleges', path: '/colleges', icon: School }
    );
  }
  return base;
};

const NavItem = ({ link, role, onClick }) => {
  const theme = roleColors[role] || roleColors.super_admin;
  return (
    <NavLink
      to={link.path}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 group ${
          isActive
            ? `bg-gradient-to-r ${theme.active} text-white shadow-lg`
            : 'text-gray-500 hover:bg-white/80 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <link.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
          <span className="truncate">{link.name}</span>
        </>
      )}
    </NavLink>
  );
};

const SidebarContent = ({ user, role, links, onLinkClick }) => {
  const { logout } = useAuthStore();
  const theme = roleColors[role] || roleColors.super_admin;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <img src="/pccoe-logo-new.webp" alt="MessConnect Logo" className="w-10 h-10 flex-shrink-0 object-contain drop-shadow-md" />
          <h1 className="text-xl font-black text-gray-900 tracking-tight">MessConnect</h1>
        </div>
        {role && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl border ${theme.pill}`}>
            <span className={`w-2 h-2 rounded-full ${theme.dot} animate-pulse flex-shrink-0`}></span>
            {role.replace('_', ' ')}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavItem key={link.path} link={link} role={role} onClick={onLinkClick} />
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-100/80 mt-2">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.active} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
            {(user?.name || 'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { onLinkClick && onLinkClick(); logout(); }}
          className="flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-100 hover:border-red-200 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const links = getLinks(role);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden lg:flex w-64 xl:w-72 m-3 rounded-[2rem] flex-col flex-shrink-0 h-[calc(100vh-1.5rem)] shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative z-20 overflow-hidden border border-white/60 bg-white/70 backdrop-blur-xl">
        <SidebarContent user={user} role={role} links={links} onLinkClick={null} />
      </aside>

      {/* ─── Mobile Hamburger Button (renders inside Layout topbar) ─── */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={20} className="text-gray-700" />
      </button>

      {/* ─── Mobile Overlay ─── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Mobile Slide-out Drawer ─── */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 flex flex-col bg-white/95 backdrop-blur-2xl border-r border-gray-200 shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-2">
          <SidebarContent user={user} role={role} links={links} onLinkClick={() => setMobileOpen(false)} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
