import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: string;
    size?: 'small' | 'medium' | 'large';
}

export const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children, maxWidth, size = 'medium' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        small: '400px',
        medium: '600px',
        large: '900px'
    };

    const finalMaxWidth = maxWidth || sizeClasses[size];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                style={{ width: '100%', maxWidth: finalMaxWidth, maxHeight: '90vh' }}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-slate-900/50">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto bg-slate-950">
                    {children}
                </div>
            </div>
        </div>
    );
};
