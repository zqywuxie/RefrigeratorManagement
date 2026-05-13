import React, { useState } from 'react';
import { Database, Lock, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
      setMessage('请填写用户名和密码');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('两次密码不一致');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await register(normalizedUsername, password, 'user');
      await login(normalizedUsername, password);
    } catch (err: any) {
      setMessage(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === 'register';

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
            <h1 className="text-[22px] font-semibold">
              {isRegister ? '注册冰箱管理系统' : '冰箱管理系统登录'}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--app-muted)' }}>
              Refrigerator Management
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-2 gap-1 rounded-lg p-1 mb-5"
          style={{ background: 'var(--app-input-muted-bg)', border: '1px solid var(--app-border)' }}
        >
          {(['login', 'register'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setMessage('');
                setConfirmPassword('');
              }}
              className="rounded-md py-1.5 text-[13px] transition-all"
              style={{
                background: mode === item ? '#2563eb' : 'transparent',
                color: mode === item ? '#ffffff' : 'var(--app-muted)',
                boxShadow: mode === item ? '0 8px 18px rgba(37,99,235,0.18)' : 'none',
              }}
            >
              {item === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] mb-1" style={{ color: 'var(--app-subtle-text)' }}>
              用户名
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? '3-32 位字母、数字、_ 或 -' : '请输入用户名'}
              className="w-full rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: 'var(--app-input-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] mb-1" style={{ color: 'var(--app-subtle-text)' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: 'var(--app-input-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
            />
          </div>
          {isRegister && (
            <div>
              <label className="block text-[13px] mb-1" style={{ color: 'var(--app-subtle-text)' }}>
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 outline-none"
                style={{ borderColor: 'var(--app-input-border)', background: 'var(--app-input-bg)', color: 'var(--app-text)' }}
              />
            </div>
          )}
          <button
            disabled={loading}
            className="w-full rounded-lg py-2.5 flex items-center justify-center gap-2 text-white"
            style={{ background: loading ? '#94a3b8' : '#2563eb' }}
          >
            {isRegister ? <UserPlus size={17} /> : <Lock size={17} />}
            {loading ? (isRegister ? '注册中...' : '登录中...') : isRegister ? '注册并登录' : '登录'}
          </button>
        </form>

        {message && (
          <div
            className="mt-4 rounded-lg px-3 py-2 text-[13px]"
            style={{
              background: 'var(--app-subtle-bg)',
              border: '1px solid var(--app-subtle-border)',
              color: 'var(--app-subtle-text)',
            }}
          >
            {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
