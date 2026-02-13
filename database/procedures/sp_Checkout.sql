/* =============================================================
   STORED PROCEDURE: sp_Checkout
   PROJECT: AISTHEA
   DATE: 2026-02-12
   DESCRIPTION: Process user checkout atomically.
                Validate Stock -> Deduct Stock -> Create Order -> Clear Cart
   USAGE: EXEC sp_Checkout @UserId=1, @PaymentMethod='COD';
   ============================================================= */

USE AISTHEA;
GO

IF OBJECT_ID('sp_Checkout', 'P') IS NOT NULL
    DROP PROCEDURE sp_Checkout;
GO

CREATE PROCEDURE sp_Checkout
    @UserId INT,
    @PaymentMethod NVARCHAR(50), -- 'COD', 'CreditCard', 'Paypal'
    @ShippingAddress NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; -- Auto-rollback on error

    DECLARE @OrderId INT = 0;
    DECLARE @TotalAmount DECIMAL(18, 2) = 0;
    DECLARE @CartId INT;

    -- 1. Get User's Active Cart
    SELECT @CartId = CartId 
    FROM Carts 
    WHERE UserId = @UserId; -- Assuming only 1 active cart per user logic, or user passes CartId

    IF @CartId IS NULL
    BEGIN
        RAISERROR('No active cart found for user.', 16, 1);
        RETURN;
    END

    -- 2. Calculate Total Amount
    SELECT @TotalAmount = SUM(ci.Quantity * pv.Price)
    FROM CartItems ci
    JOIN ProductVariants pv ON ci.VariantId = pv.VariantId
    WHERE ci.CartId = @CartId;

    IF @TotalAmount IS NULL OR @TotalAmount = 0
    BEGIN
        RAISERROR('Cart is empty.', 16, 1);
        RETURN;
    END

    -- START TRANSACTION
    BEGIN TRANSACTION;

    BEGIN TRY
        -- 3. Check Stock Availability & Deduct Stock
        -- Strategy: Use UPDATE directly with check to lock rows and validate in one step
        -- If any update fails (Stock < Qty), it will raise error via check constraint 
        -- or we check @@ROWCOUNT if we use WHERE clause.
        
        -- Better approach: Check first (Dirty read safe? No. Use row lock or just rely on Update)
        -- Let's iterate or use set-based update check.
        
        -- Check if any item has insufficient stock
        IF EXISTS (
            SELECT 1
            FROM CartItems ci
            JOIN ProductVariants pv ON ci.VariantId = pv.VariantId
            WHERE ci.CartId = @CartId
            AND pv.StockQuantity < ci.Quantity
        )
        BEGIN
            RAISERROR('Insufficient stock for one or more items.', 16, 1);
        END

        -- Deduct Stock
        UPDATE pv
        SET pv.StockQuantity = pv.StockQuantity - ci.Quantity
        FROM ProductVariants pv
        JOIN CartItems ci ON pv.VariantId = ci.VariantId
        WHERE ci.CartId = @CartId;

        -- 4. Create Order
        INSERT INTO Orders (UserId, OrderNumber, TotalAmount, Status, CreatedAt)
        VALUES (@UserId, 'ORD-' + CONVERT(NVARCHAR(20), GETDATE(), 112) + '-' + CAST(NEWID() AS NVARCHAR(8)), @TotalAmount, 'Pending', GETDATE());
        
        SET @OrderId = SCOPE_IDENTITY();

        -- 5. Create OrderItems
        INSERT INTO OrderItems (OrderId, VariantId, Quantity, UnitPrice)
        SELECT @OrderId, ci.VariantId, ci.Quantity, pv.Price
        FROM CartItems ci
        JOIN ProductVariants pv ON ci.VariantId = pv.VariantId
        WHERE ci.CartId = @CartId;

        -- 6. Create Payment Record
        INSERT INTO Payments (OrderId, PaymentMethod, PaymentDate, Amount, Status)
        VALUES (@OrderId, @PaymentMethod, GETDATE(), @TotalAmount, 'Pending');

        -- 7. Clear Cart
        DELETE FROM CartItems WHERE CartId = @CartId;
        -- Optional: DELETE FROM Carts WHERE CartId = @CartId; if carts are transient

        COMMIT TRANSACTION;
        
        -- Return the new OrderId
        SELECT @OrderId AS OrderId, 'Success' AS Status;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

PRINT 'Created procedure sp_Checkout';
GO
