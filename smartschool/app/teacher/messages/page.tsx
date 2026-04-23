'use client';
// app/teacher/messages/page.tsx — Messages & Comms
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Bell, FileText, MessageCircle, Megaphone, DollarSign } from 'lucide-react';
import { useMessages, useSendMessage } from '@/lib/hooks/useQueries';
import { BottomNav } from '@/components/layouts/BottomNav';
import { BackHeader, BottomSheet, CardSkeleton, EmptyState } from '@/components/ui/shared';
import { format, parseISO } from 'date-fns';
import type { Message, MessageType } from '@/lib/types';
import toast from 'react-hot-toast';

const TYPE_CONFIG: Record<MessageType, { icon: React.ElementType; color: string; bg: string }> = {
  fee_reminder:  { icon: DollarSign,     color: 'text-accent',   bg: 'bg-accent/10' },
  newsletter:    { icon: FileText,       color: 'text-trust',    bg: 'bg-trust/10'  },
  pulse_report:  { icon: Bell,           color: 'text-success',  bg: 'bg-success/10'},
  result_alert:  { icon: MessageCircle,  color: 'text-primary',  bg: 'bg-primary/10'},
  announcement:  { icon: Megaphone,      color: 'text-ink',      bg: 'bg-surface'   },
};

function MessageCard({ msg }: { msg: Message }) {
  const cfg  = TYPE_CONFIG[msg.type as MessageType] ?? TYPE_CONFIG.announcement;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card flex gap-3 items-start border-l-4 ${
        msg.isRead ? 'border-l-border' : 'border-l-primary'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon size={18} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className={`text-sm font-bold leading-tight ${msg.isRead ? 'text-muted' : 'text-ink'}`}>
            {msg.title}
          </p>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] text-muted whitespace-nowrap">
              {format(parseISO(msg.sentAt), 'MMM d, h:mm a')}
            </span>
            {!msg.isRead && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted mt-0.5 line-clamp-2">{msg.body}</p>
        <div className="flex gap-3 mt-2">
          <span className="text-[10px] text-muted">
            📤 {msg.recipientCount} sent
          </span>
          <span className="text-[10px] text-success">
            ✅ {msg.deliveredCount} delivered
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ComposeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [type,    setType]    = useState<MessageType>('newsletter');
  const { mutateAsync: send, isPending } = useSendMessage();

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    await send({ type, title: title.trim(), body: body.trim() });
    setTitle(''); setBody('');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New Message 📢">
      <div className="flex flex-col gap-4">
        {/* Type selector */}
        <div>
          <label className="label">Message type</label>
          <div className="flex gap-2 flex-wrap">
            {(['newsletter','fee_reminder','announcement'] as MessageType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  type === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="msg-title">Title</label>
          <input
            id="msg-title"
            className="input"
            placeholder="e.g. Sports Day this Friday!"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div>
          <label className="label" htmlFor="msg-body">Message</label>
          <textarea
            id="msg-body"
            className="input resize-none h-28"
            placeholder="Write your message to parents…"
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={500}
          />
          <p className="text-[10px] text-muted mt-1 text-right">{body.length}/500</p>
        </div>

        <div className="bg-success/8 rounded-xl p-3 text-xs text-success font-semibold border border-success/20 flex gap-2">
          <span>📲</span>
          <span>Will be delivered to all class parents via WhatsApp instantly</span>
        </div>

        <button
          onClick={handleSend}
          disabled={isPending || !title || !body}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {isPending
            ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
            : <><Send size={16} /> Send to All Parents</>
          }
        </button>
      </div>
    </BottomSheet>
  );
}

export default function MessagesPage() {
  const { data: messages, isLoading } = useMessages();
  const [composing, setComposing] = useState(false);

  const unreadCount = messages?.filter(m => !m.isRead).length ?? 0;

  return (
    <div className="phone-safe pb-20 bg-surface">
      <BackHeader
        title="Messages 💬"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        right={
          <button
            onClick={() => setComposing(true)}
            className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"
          >
            <Send size={12} /> New
          </button>
        }
      />

      <div className="px-5 py-4 flex flex-col gap-3">
        {isLoading
          ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
          : messages?.length === 0
          ? <EmptyState emoji="📭" title="No messages yet" description="Send a newsletter or fee reminder to parents." action={
              <button onClick={() => setComposing(true)} className="btn-primary h-10 text-sm px-6 rounded-xl">
                Send first message
              </button>
            } />
          : messages?.map(msg => <MessageCard key={msg.id} msg={msg} />)
        }
      </div>

      <ComposeSheet open={composing} onClose={() => setComposing(false)} />
      <BottomNav role="teacher" />
    </div>
  );
}
