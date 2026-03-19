import { z } from 'zod';

export {
    loginSchema as loginBodySchema,
    registerSchema as registerBodySchema,
} from '../../shared/validation/schemas/auth';

import {
    loginSchema as loginBodySchema,
    registerSchema as registerBodySchema,
} from '../../shared/validation/schemas/auth';

export const registerSchema = z.object({ body: registerBodySchema });
export const loginSchema = z.object({ body: loginBodySchema });

export type {
    LoginInput,
    RegisterInput,
} from '../../shared/validation/schemas/auth';
