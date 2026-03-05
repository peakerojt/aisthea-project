-- Script insert 10 mã giảm giá (Vouchers/Coupons) trực tiếp vào SQL Server Database
-- File này lưu trữ tại database/seeds để quản lý dữ liệu gốc.

-- Chèn dữ liệu vào bảng Coupons
INSERT INTO [dbo].[Coupons] 
    ([Code], [Type], [Value], [MaxDiscountAmount], [MinOrderValue], [StartDate], [EndDate], [UsageLimit], [UsedCount], [UsagePerUser], [IsActive], [CreatedAt], [UpdatedAt])
VALUES
    -- 1. Mã giảm cố định: WELCOME50K (Giảm 50K cho đơn từ 200K, HSD: 30 ngày)
    ('WELCOME50K', 'FIXED_AMOUNT', 50000, NULL, 200000, GETDATE(), DATEADD(day, 30, GETDATE()), 500, 0, 1, 1, GETDATE(), GETDATE()),
    
    -- 2. Mã giảm cố định: AISTHEA200 (Giảm 200K cho đơn từ 1Tr, HSD: 90 ngày)
    ('AISTHEA200', 'FIXED_AMOUNT', 200000, NULL, 1000000, GETDATE(), DATEADD(day, 90, GETDATE()), 200, 0, 1, 1, GETDATE(), GETDATE()),
    
    -- 3. Mã giảm cố định: MINI20K (Giảm 20K cho đơn từ 100K, siêu dễ dùng)
    ('MINI20K', 'FIXED_AMOUNT', 20000, NULL, 100000, GETDATE(), DATEADD(day, 15, GETDATE()), 1000, 0, 2, 1, GETDATE(), GETDATE()),
    
    -- 4. Mã giảm cố định (Miễn phí vận chuyển): FREESHIP (Giảm 30K)
    ('FREESHIP', 'FIXED_AMOUNT', 30000, NULL, 150000, GETDATE(), DATEADD(day, 60, GETDATE()), 1000, 0, 3, 1, GETDATE(), GETDATE()),
    
    -- 5. Mã giảm cố định VIP: VIP500K (Giảm 500K cho đơn cực khủng từ 5Tr)
    ('VIP500K', 'FIXED_AMOUNT', 500000, NULL, 5000000, GETDATE(), DATEADD(year, 1, GETDATE()), 50, 0, 1, 1, GETDATE(), GETDATE()),

    -- 6. Mã giảm theo %: SUMMER10 (Giảm 10%, Tối đa 100K, Đơn từ 300K)
    ('SUMMER10', 'PERCENTAGE', 10, 100000, 300000, GETDATE(), DATEADD(day, 30, GETDATE()), 300, 0, 1, 1, GETDATE(), GETDATE()),
    
    -- 7. Mã giảm theo %: FLASH20 (Giảm 20%, Tối đa 150K, Đơn từ 500K - Flash Sale HSD 3 ngày)
    ('FLASH20', 'PERCENTAGE', 20, 150000, 500000, GETDATE(), DATEADD(day, 3, GETDATE()), 100, 0, 1, 1, GETDATE(), GETDATE()),
    
    -- 8. Mã giảm theo %: HUGE30 (Giảm 30%, Tối đa 300K, Đơn từ 800K)
    ('HUGE30', 'PERCENTAGE', 30, 300000, 800000, GETDATE(), DATEADD(day, 7, GETDATE()), 50, 0, 1, 1, GETDATE(), GETDATE()),
    
    -- 9. Mã giảm theo %: TET50 (Giảm 50%, Tối đa 500K, Đơn từ 1.5Tr)
    ('TET50', 'PERCENTAGE', 50, 500000, 1500000, GETDATE(), DATEADD(day, 60, GETDATE()), 20, 0, 1, 1, GETDATE(), GETDATE()),
    
    -- 10. Mã giảm theo % Khách hàng thân thiết: LOYAL5 (Giảm 5%, Tối đa 50K, Không giới hạn Min Order)
    ('LOYAL5', 'PERCENTAGE', 5, 50000, 0, GETDATE(), DATEADD(day, 180, GETDATE()), 5000, 0, 5, 1, GETDATE(), GETDATE());
GO
