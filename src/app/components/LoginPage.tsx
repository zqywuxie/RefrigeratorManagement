import React, { useState } from 'react';
import { Database, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('root123');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setMessage(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'var(--app-bg)',
        color: 'var(--app-text)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl p-7"
        style={{
          background: 'var(--app-card-bg)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: 'var(--app-logo-bg)',
              border: '1px solid var(--app-logo-border)',
              color: 'var(--app-logo-icon)',
            }}
          >
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold">冰箱管理系统登录</h1>
            <p className="text-[13px]" style={{ color: '#64748b' }}>
              Refrigerator Management
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] mb-1" style={{ color: '#475569' }}>
              用户名
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: '#cbd5e1', background: '#eef3f8' }}
            />
          </div>
          <div>
            <label className="block text-[13px] mb-1" style={{ color: '#475569' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: '#cbd5e1', background: '#eef3f8' }}
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 text-white"
            style={{ background: loading ? '#94a3b8' : '#2563eb' }}
          >
            <Lock size={17} />
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-lg px-3 py-2 text-[13px]" style={{ background: '#f1f5f9', color: '#475569' }}>
            {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
