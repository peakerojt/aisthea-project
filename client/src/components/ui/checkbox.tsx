import React from 'react';

interface CheckboxProps {
    id?: string;
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    className?: string;
}

/**
 * Lightweight Checkbox component compatible with the Shadcn/UI API surface.
 * Uses a custom-styled native checkbox for zero external dependency.
 */
export const Checkbox: React.FC<CheckboxProps> = ({
    id,
    checked = false,
    disabled = false,
    onCheckedChange,
    className = '',
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!disabled && onCheckedChange) {
            onCheckedChange(e.target.checked);
        }
    };

    return (
        <label
            htmlFor={id}
            className={`relative inline-flex items-center justify-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={handleChange}
                className="sr-only"
            />
            {/* Custom visual checkbox */}
            <span
                data-state={checked ? 'checked' : 'unchecked'}
                className={`
                    flex items-center justify-center
                    w-5 h-5 rounded border transition-all duration-150
                    ${checked
                        ? 'bg-[#e63946] border-[#e63946] shadow-sm shadow-[#e63946]/30'
                        : 'bg-transparent border-white/25 hover:border-white/50'
                    }
                    ${disabled ? 'opacity-40' : ''}
                    ${className}
                `}
            >
                {checked && (
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-white"
                    >
                        <path
                            d="M2 6L5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </span>
        </label>
    );
};

export default Checkbox;
