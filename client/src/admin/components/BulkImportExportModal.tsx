
import React, { useState, useCallback, useRef } from 'react';
import {
    FileSpreadsheet,
    Download,
    Upload,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    FileDown,
    FileUp,
    ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    AdminModalShell,
    AdminPrimaryButton,
    AdminSecondaryButton,
} from '@/admin/components/AdminUI';
import { downloadTemplate, exportAllProducts, importProducts, ImportReport } from '@/common/services/product.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'export' | 'import';

type ImportState =
    | { phase: 'idle' }
    | { phase: 'file_selected'; file: File }
    | { phase: 'uploading'; progress: number; step: string }
    | { phase: 'done'; report: ImportReport };

interface Props {
    onClose: (didImport: boolean) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UPLOAD_STEPS = [
    'Đang đọc file...',
    'Đang xác thực dữ liệu...',
    'Đang ghi vào cơ sở dữ liệu...',
    'Hoàn tất!',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const BulkImportExportModal: React.FC<Props> = ({ onClose }) => {
    const { t } = useTranslation('errors');
    const [tab, setTab] = useState<Tab>('export');
    const [importState, setImportState] = useState<ImportState>({ phase: 'idle' });
    const [exportLoading, setExportLoading] = useState(false);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Export handlers ────────────────────────────────────────────────────────

    const handleDownloadTemplate = async () => {
        setTemplateLoading(true);
        try {
            await downloadTemplate();
        } catch {
            // silent — browser handles download errors
        } finally {
            setTemplateLoading(false);
        }
    };

    const handleExportAll = async () => {
        setExportLoading(true);
        try {
            await exportAllProducts();
        } catch {
            // silent
        } finally {
            setExportLoading(false);
        }
    };

    // ── Import handlers ────────────────────────────────────────────────────────

    const handleFileSelected = (file: File) => {
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            alert('Vui lòng chọn file Excel (.xlsx) hoặc CSV (.csv)');
            return;
        }
        setImportState({ phase: 'file_selected', file });
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelected(file);
    }, []);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const simulateProgress = (onDone: () => void) => {
        let stepIdx = 0;
        let progress = 0;

        const tick = setInterval(() => {
            progress += Math.random() * 18 + 8;
            if (progress > 95) progress = 95;

            const stepProgress = Math.floor((progress / 100) * UPLOAD_STEPS.length);
            stepIdx = Math.min(stepProgress, UPLOAD_STEPS.length - 2);

            setImportState({
                phase: 'uploading',
                progress: Math.floor(progress),
                step: UPLOAD_STEPS[stepIdx],
            });

            if (progress >= 95) {
                clearInterval(tick);
                onDone();
            }
        }, 280);
    };

    const handleStartImport = async () => {
        if (importState.phase !== 'file_selected') return;
        const file = importState.file;

        setImportState({ phase: 'uploading', progress: 0, step: UPLOAD_STEPS[0] });

        try {
            let report: ImportReport | null = null;
            let done = false;

            // Simulate visual progress while real upload runs
            const uploadPromise = importProducts(file).then((r) => {
                report = r;
                done = true;
            });

            simulateProgress(() => {
                uploadPromise.then(() => {
                    setImportState({
                        phase: 'uploading',
                        progress: 100,
                        step: UPLOAD_STEPS[UPLOAD_STEPS.length - 1],
                    });
                    setTimeout(() => {
                        if (report) {
                            setImportState({ phase: 'done', report });
                        }
                    }, 600);
                });
            });

            await uploadPromise;
            if (!done) return; // already handled by simulateProgress callback
        } catch (err: unknown) {
            setImportState({
                phase: 'done',
                report: {
                    total: 0,
                    success: 0,
                    failed: 1,
                    errors: [{ row: -1, handle: '', reason: (err as Error).message ?? t('NETWORK_ERROR') }],
                },
            });
        }
    };

    const resetImport = () => setImportState({ phase: 'idle' });

    const handleClose = () => {
        const didImport = importState.phase === 'done' && importState.report.success > 0;
        onClose(didImport);
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <AdminModalShell
            icon={FileSpreadsheet}
            iconWrapperClassName="border-red-500/20 bg-red-500/10 text-red-400"
            iconClassName="text-red-400"
            title="Nhập / Xuất Sản Phẩm"
            subtitle="Nhập và xuất hàng loạt"
            onClose={handleClose}
            maxWidthClassName="max-w-2xl"
            panelClassName="max-h-[90vh] overflow-hidden rounded-sm"
            bodyClassName="overflow-y-auto flex-1"
            footer={(
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/30">
                        Định dạng: Excel phẳng kiểu Shopify, mỗi hàng là một biến thể
                    </p>
                    <AdminSecondaryButton
                        onClick={handleClose}
                        className="rounded-sm px-5 py-2 text-xs"
                    >
                        Đóng
                    </AdminSecondaryButton>
                </div>
            )}
        >

                {/* Tabs */}
                <div className="flex border-b border-white/8">
                    {(['export', 'import'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); resetImport(); }}
                            className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors ${tab === t ? 'text-white' : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            {t === 'export' ? <FileDown size={14} /> : <FileUp size={14} />}
                            {t === 'export' ? 'Xuất dữ liệu' : 'Nhập dữ liệu'}
                            {tab === t && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-red-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6">
                    {/* ── Export Tab ────────────────────────────────────────────────── */}
                    {tab === 'export' && (
                        <div className="flex flex-col gap-4">
                            {/* Download template card */}
                            <div className="group rounded-sm border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-colors p-5 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet size={18} className="text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-white mb-1">Tải file mẫu</h3>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        File Excel trống với đầy đủ cột & hướng dẫn. Điền dữ liệu vào và nhập lại.
                                    </p>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    disabled={templateLoading}
                                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-bold rounded-sm transition-colors cursor-pointer"
                                >
                                    {templateLoading ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Download size={13} />
                                    )}
                                    Tải xuống (.xlsx)
                                </button>
                            </div>

                            {/* Export all products card */}
                            <div className="group rounded-sm border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-colors p-5 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Download size={18} className="text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-white mb-1">Xuất toàn bộ sản phẩm</h3>
                                    <p className="text-xs text-white/50 leading-relaxed">
                                        Tải xuống tất cả sản phẩm, biến thể, thuộc tính hiện có dưới dạng Excel. Dùng để backup hoặc chỉnh sửa hàng loạt.
                                    </p>
                                </div>
                                <button
                                    onClick={handleExportAll}
                                    disabled={exportLoading}
                                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold rounded-sm transition-colors cursor-pointer"
                                >
                                    {exportLoading ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Download size={13} />
                                    )}
                                    Xuất Excel
                                </button>
                            </div>

                            {/* Format guide */}
                            <div className="rounded-sm border border-white/5 bg-white/[0.015] p-4">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Cấu trúc cột trong file</p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                    {[ 
                                        ['Mã handle', 'Slug dùng để nhóm biến thể'],
                                        ['Tên sản phẩm', 'Chỉ cần điền ở hàng đầu tiên'],
                                        ['Mô tả', 'Mô tả sản phẩm (tùy chọn)'],
                                        ['Danh mục', 'Tên danh mục khớp trong DB'],
                                        ['SKU', 'Mã duy nhất cho từng biến thể'],
                                        ['Giá bán', 'Số nguyên dương (VNĐ)'],
                                        ['Tồn kho', 'Số nguyên không âm'],
                                        ['Nhóm / Giá trị 1 & 2', 'VD: Màu sắc / Đỏ'],
                                        ['URL Hình ảnh', 'Chỉ cần ở hàng đầu tiên'],
                                    ].map(([col, desc]) => (
                                        <div key={col} className="flex items-center gap-2 py-0.5">
                                            <ChevronRight size={10} className="text-red-400 shrink-0" />
                                            <span className="text-[11px]">
                                                <span className="text-white/70 font-semibold">{col}</span>
                                                <span className="text-white/30"> — {desc}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Import Tab ────────────────────────────────────────────────── */}
                    {tab === 'import' && (
                        <div className="flex flex-col gap-5">
                            {/* Idle / file selected state */}
                            {(importState.phase === 'idle' || importState.phase === 'file_selected') && (
                                <>
                                    {/* Drop zone */}
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative rounded-sm border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 py-12 px-6 text-center ${isDragging
                                            ? 'border-red-500 bg-red-500/5 shadow-[0_0_30px_rgba(220,38,38,0.1)]'
                                            : importState.phase === 'file_selected'
                                                ? 'border-emerald-500/60 bg-emerald-500/5'
                                                : 'border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            className="hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleFileSelected(f);
                                                e.target.value = '';
                                            }}
                                        />

                                        {importState.phase === 'file_selected' ? (
                                            <>
                                                <div className="w-12 h-12 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                    <FileSpreadsheet size={22} className="text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{importState.file.name}</p>
                                                    <p className="text-xs text-white/40 mt-1">
                                                        {(importState.file.size / 1024).toFixed(1)} KB — nhấn để đổi file
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`w-12 h-12 rounded-sm flex items-center justify-center transition-colors ${isDragging ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 border border-white/10'
                                                    }`}>
                                                    <Upload size={22} className={isDragging ? 'text-red-400' : 'text-white/40'} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white/80">
                                                        Kéo & thả file vào đây, hoặc{' '}
                                                        <span className="text-red-400 font-bold">chọn file</span>
                                                    </p>
                                                    <p className="text-xs text-white/40 mt-1">Hỗ trợ: .xlsx, .xls, .csv — tối đa 50 MB</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    {importState.phase === 'file_selected' && (
                                        <AdminPrimaryButton
                                            onClick={handleStartImport}
                                            className="w-full rounded-sm py-3 text-sm shadow-lg shadow-red-900/30"
                                        >
                                            <Upload size={16} />
                                            Bắt đầu nhập dữ liệu
                                        </AdminPrimaryButton>
                                    )}

                                    {/* Tips */}
                                    <div className="rounded-sm bg-white/[0.02] border border-white/5 px-4 py-3 flex items-start gap-3">
                                        <AlertCircle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-white/50 leading-relaxed">
                                            <span className="text-white/70 font-semibold">Lưu ý:</span>{' '}
                                            Hàng có mã handle trùng nhau sẽ được gộp thành một sản phẩm. Nếu mã handle đã tồn tại trong hệ thống, sản phẩm sẽ được <em>cập nhật</em>. Các hàng lỗi sẽ được bỏ qua và báo cáo riêng, không ảnh hưởng đến các hàng hợp lệ.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Upload progress */}
                            {importState.phase === 'uploading' && (
                                <div className="flex flex-col items-center gap-6 py-8">
                                    <div className="w-16 h-16 rounded-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                        <Loader2 size={28} className="text-red-400 animate-spin" />
                                    </div>
                                    <div className="w-full max-w-sm text-center">
                                        <p className="text-sm font-bold text-white mb-1">{importState.step}</p>
                                        <p className="text-xs text-white/40 mb-4">{importState.progress}% hoàn thành</p>
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-[width] duration-300"
                                                style={{ width: `${importState.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Result report */}
                            {importState.phase === 'done' && (
                                <div className="flex flex-col gap-4">
                                    {/* Summary chips */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                                            <span className="text-xs text-white/50">Tổng</span>
                                            <span className="text-sm font-bold text-white">{importState.report.total}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                            <CheckCircle2 size={13} className="text-emerald-400" />
                                            <span className="text-xs text-emerald-400 font-semibold">Thành công: {importState.report.success}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${importState.report.failed > 0
                                            ? 'bg-red-500/10 border border-red-500/20'
                                            : 'bg-white/5 border border-white/10'
                                            }`}>
                                            <XCircle size={13} className={importState.report.failed > 0 ? 'text-red-400' : 'text-white/40'} />
                                            <span className={`text-xs font-semibold ${importState.report.failed > 0 ? 'text-red-400' : 'text-white/40'}`}>
                                                Thất bại: {importState.report.failed}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Success banner */}
                                    {importState.report.success > 0 && importState.report.failed === 0 && (
                                        <div className="rounded-sm bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-3">
                                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                            <p className="text-sm text-emerald-300 font-semibold">
                                                Nhập thành công {importState.report.success} phân loại — không có lỗi!
                                            </p>
                                        </div>
                                    )}

                                    {/* Error table */}
                                    {importState.report.errors.length > 0 && (
                                        <div className="rounded-sm border border-white/8 overflow-hidden">
                                            <div className="bg-red-500/5 border-b border-white/8 px-4 py-2.5 flex items-center gap-2">
                                                <XCircle size={13} className="text-red-400" />
                                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Chi tiết lỗi</span>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-white/[0.02]">
                                                        <tr className="text-[10px] uppercase tracking-widest text-white/40">
                                                            <th className="px-4 py-2 font-semibold w-16">Hàng</th>
                                                            <th className="px-4 py-2 font-semibold w-40">Mã handle</th>
                                                            <th className="px-4 py-2 font-semibold">Lý do lỗi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5 text-xs">
                                                        {importState.report.errors.map((err, idx) => (
                                                            <tr key={idx} className="hover:bg-white/[0.02]">
                                                                <td className="px-4 py-2.5 text-white/50 font-mono">
                                                                    {err.row > 0 ? `#${err.row}` : '—'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-white/60 font-mono truncate max-w-[150px]">
                                                                    {err.handle || '—'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-red-300">{err.reason}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Reset button */}
                                    <button
                                        onClick={resetImport}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 border border-white/10 hover:bg-white/5 text-white/70 hover:text-white text-xs font-semibold rounded-sm transition-colors cursor-pointer"
                                    >
                                        <Upload size={13} />
                                        Nhập thêm file khác
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
        </AdminModalShell>
    );
};
