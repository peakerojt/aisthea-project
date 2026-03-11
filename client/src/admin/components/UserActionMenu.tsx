import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { MoreHorizontal, ShieldCheck, Lock, Unlock, ClipboardList } from 'lucide-react';
import { AdminUser } from '@/common/services/user-admin.service';

interface UserActionMenuProps {
    user: AdminUser;
    onBanToggle: (user: AdminUser) => void;
    onChangeRole: (user: AdminUser) => void;
    onViewOrders?: (user: AdminUser) => void;
}

export const UserActionMenu: React.FC<UserActionMenuProps> = ({
    user,
    onBanToggle,
    onChangeRole,
    onViewOrders,
}) => {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Calculate position from trigger button when opening
    const handleToggle = () => {
        if (!open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setMenuPos({
                top: rect.bottom + 6,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen((v) => !v);
    };

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    // Close on scroll/resize so position doesn't go stale
    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    const isBanned = user.status === 'Banned';

    const dropdown = open
        ? ReactDOM.createPortal(
            <div
                ref={menuRef}
                style={{ top: menuPos.top, right: menuPos.right }}
                className="fixed z-[9999] min-w-[190px] bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Phân quyền */}
                <button
                    onClick={() => { setOpen(false); onChangeRole(user); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                    <ShieldCheck size={15} className="text-teal-400" />
                    Phân quyền
                </button>

                <div className="border-t border-white/[0.06]" />

                {/* Ban / Unban */}
                <button
                    onClick={() => { setOpen(false); onBanToggle(user); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors cursor-pointer text-left ${isBanned
                        ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5'
                        : 'text-red-400 hover:text-red-300 hover:bg-red-500/5'
                        }`}
                >
                    {isBanned ? <Unlock size={15} /> : <Lock size={15} />}
                    {isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                </button>

                {onViewOrders && (
                    <>
                        <div className="border-t border-white/[0.06]" />
                        <button
                            onClick={() => { setOpen(false); onViewOrders(user); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                        >
                            <ClipboardList size={15} className="text-blue-400" />
                            Xem lịch sử đơn hàng
                        </button>
                    </>
                )}
            </div>,
            document.body
        )
        : null;

    return (
        <div className="inline-block" onClick={(e) => e.stopPropagation()}>
            <button
                ref={triggerRef}
                onClick={handleToggle}
                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
                title="Thao tác"
            >
                <MoreHorizontal size={18} />
            </button>

            {dropdown}
        </div>
    );
};

