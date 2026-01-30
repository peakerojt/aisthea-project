
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Example protected route
router.get('/me', authenticateToken, (req: any, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
});

export default router;
