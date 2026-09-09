import React, { useState } from 'react';
import { Mail, Send, MessageSquare, CheckCircle2, User, HelpCircle } from 'lucide-react';

interface ContactPageProps {
  telegramUrl?: string;
  telegramSupportUrl?: string;
  telegramGroupUrl?: string;
}

export const ContactPage: React.FC<ContactPageProps> = ({ 
  telegramUrl,
  telegramSupportUrl = '',
  telegramGroupUrl = ''
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitted(true);
  };

  return (
    <div className="py-10 max-w-2xl mx-auto px-4">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-2">
          <Mail className="w-3.5 h-3.5" /> Direct Assistance
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Contact Customer Support</h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Have a question about your order or need key activation help? Send us a message or join our Telegram channel.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Message Sent!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Thank you for contacting PeakLoader Shop support. Our team will review your query and reply to <strong className="text-white">{email}</strong> shortly.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setName('');
                setEmail('');
                setMessage('');
              }}
              className="mt-6 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Message / Order ID
              </label>
              <textarea
                required
                rows={4}
                placeholder="Include your Order ID if referencing a key purchase..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white text-sm rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Message</span>
            </button>
          </form>
        )}

        {(telegramUrl || telegramGroupUrl || telegramSupportUrl) && <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <span className="text-xs text-slate-400 block mb-3">Prefer live chat? Reach out to us directly:</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {telegramGroupUrl && <a
              href={telegramGroupUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 text-xs font-bold transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Join Telegram Group</span>
            </a>}
            {telegramSupportUrl && <a
              href={telegramSupportUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Telegram Live Support</span>
            </a>}
          </div>
        </div>}
      </div>
    </div>
  );
};
