'use client';
// app/page.tsx — Splash + Login
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { LoginSchema, type LoginInput, type Role } from '@/lib/types';
import toast from 'react-hot-toast';

type Screen = 'splash' | 'login';

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>('splash');
  const router  = useRouter();
  const setUser = useAuthStore(s => s.setUser);

  // Auto-advance splash
  useEffect(() => {
    const t = setTimeout(() => setScreen('login'), 2600);
    return () => clearTimeout(t);
  }, []);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver:     zodResolver(LoginSchema),
    defaultValues: { role: 'teacher' },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: LoginInput) => {
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Login failed');

      setUser(json.data.user, json.data.token);
      toast.success(`Welcome back, ${json.data.user.name.split(' ')[0]}! 👋`);
      router.push(data.role === 'md' || data.role === 'bursar' ? '/md' : '/teacher');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <div className="phone-safe overflow-hidden min-h-screen">
      <AnimatePresence mode="wait">
        {screen === 'splash' ? (
          <motion.div
            key="splash"
            className="absolute inset-0 bg-primary flex flex-col items-center justify-center gap-5"
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center text-5xl shadow-modal"
            >
              🏫
            </motion.div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">SmartSchool</h1>
              <p className="text-white/80 text-base mt-1 font-medium">Your school is smart with us.</p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="absolute bottom-10 text-white/40 text-xs font-semibold"
            >
              🇳🇬 Made for Nigerian schools
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen bg-surface flex flex-col"
          >
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-6 text-center border-b border-border">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-trust">
                🏫
              </div>
              <h2 className="text-xl font-bold text-ink">Welcome back</h2>
              <p className="text-sm text-muted mt-0.5">Sunshine Academy, Lagos</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-5 py-6 flex flex-col gap-5">
              {/* Role selector */}
              <div>
                <label className="label">I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'teacher', label: "Teacher",    emoji: '👩‍🏫' },
                    { id: 'md',      label: "MD / Bursar", emoji: '💼' },
                  ] as const).map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setValue('role', r.id as Role)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                        selectedRole === r.id
                          ? 'border-primary bg-primary/5 shadow-card scale-[1.02]'
                          : 'border-border bg-white'
                      }`}
                    >
                      <span className="text-2xl">{r.emoji}</span>
                      <span className={`text-xs font-bold ${selectedRole === r.id ? 'text-primary' : 'text-ink'}`}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="label" htmlFor="phone">School phone number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="08012345678"
                    {...register('phone')}
                    className="input pl-10"
                  />
                </div>
                {errors.phone && <p className="text-danger text-xs mt-1">{errors.phone.message}</p>}
              </div>

              {/* PIN */}
              <div>
                <label className="label" htmlFor="pin">PIN / 2FA Code</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="● ● ● ● ● ●"
                    maxLength={8}
                    {...register('pin')}
                    className="input pl-10"
                  />
                </div>
                {errors.pin && <p className="text-danger text-xs mt-1">{errors.pin.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Logging in…</> : 'Continue →'}
              </button>

              {/* Forgot PIN */}
              <p className="text-center text-sm text-muted">
                Forgot PIN?{' '}
                <a
                  href="https://wa.me/2348000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-trust font-bold"
                >
                  WhatsApp support 💬
                </a>
              </p>

              {/* Offline note */}
              <div className="bg-success/8 border border-success/20 rounded-xl p-3 flex gap-2 items-center">
                <span className="text-base">🔒</span>
                <span className="text-xs text-success font-semibold">Offline mode · Login works without internet</span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
