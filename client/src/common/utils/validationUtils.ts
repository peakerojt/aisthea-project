import { z } from 'zod';

export const passwordRequirements = {
    minLength: 8,
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasNumber: /[0-9]/,
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

export const passwordValidation = z.string()
    .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters long`)
    .regex(passwordRequirements.hasUpperCase, 'Password must contain at least one uppercase letter')
    .regex(passwordRequirements.hasLowerCase, 'Password must contain at least one lowercase letter')
    .regex(passwordRequirements.hasNumber, 'Password must contain at least one number')
    .regex(passwordRequirements.hasSpecialChar, 'Password must contain at least one special character');

export const calculatePasswordStrength = (password: string): number => {
    let score = 0;
    if (password.length >= passwordRequirements.minLength) score++;
    if (passwordRequirements.hasUpperCase.test(password)) score++;
    if (passwordRequirements.hasLowerCase.test(password)) score++;
    if (passwordRequirements.hasNumber.test(password)) score++;
    if (passwordRequirements.hasSpecialChar.test(password)) score++;
    return score;
};
