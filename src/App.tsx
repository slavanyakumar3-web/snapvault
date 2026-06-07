/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { Settings } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } }: any = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 overflow-x-hidden relative flex items-center justify-center p-4">
        <div className="w-full max-w-lg p-8 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Supabase Configuration Required</h2>
          <p className="text-gray-400 mb-6 leading-relaxed">
            Please configure your Supabase environment variables in the AI Studio Secrets panel:
          </p>
          <div className="bg-gray-950 rounded-xl p-4 text-left font-mono text-sm text-gray-300 space-y-2 mb-8">
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
            <p className="border-t border-gray-800 my-2 pt-2 text-gray-500 text-xs">And your server config:</p>
            <p>SUPABASE_SERVICE_ROLE_KEY</p>
          </div>
          <p className="text-sm text-gray-500">
            Check the README.md for detailed instructions on setting up your Supabase project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 overflow-x-hidden relative">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>
      
      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {!session ? (
          <Login onSession={() => supabase.auth.getSession().then((res: any) => setSession(res?.data?.session))} />
        ) : (
          <Dashboard onLogout={() => setSession(null)} />
        )}
      </main>
    </div>
  );
}
