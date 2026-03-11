export function formatVietnamTime(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '';

    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '';

        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date);
    } catch {
        return '';
    }
}
