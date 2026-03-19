import { passwordRequirements, passwordValidation } from '@/common/validation/schemas';

export { passwordRequirements, passwordValidation };

export const calculatePasswordStrength = (password: string): number => {
    let score = 0;
    if (password.length >= passwordRequirements.minLength) score++;
    if (passwordRequirements.hasUpperCase.test(password)) score++;
    if (passwordRequirements.hasLowerCase.test(password)) score++;
    if (passwordRequirements.hasNumber.test(password)) score++;
    if (passwordRequirements.hasSpecialChar.test(password)) score++;
    return score;
};
