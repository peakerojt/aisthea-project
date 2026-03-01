-- ============================================================
-- Migration: 20260301_add_inventory_logs
-- Purpose  : Add InventoryLogs table for stock audit trail
-- Reason values: CHECKOUT | RESTOCK | CANCELLED_RESTORE | MANUAL_ADJUST
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[InventoryLogs]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[InventoryLogs] (
        [LogId]          INT            NOT NULL IDENTITY(1,1),
        [VariantId]      INT            NOT NULL,
        [OrderId]        INT            NULL,
        [UserId]         INT            NULL,
        [ChangeQuantity] INT            NOT NULL,
        [PreviousStock]  INT            NOT NULL,
        [NewStock]       INT            NOT NULL,
        [Reason]         NVARCHAR(30)   NOT NULL,
        [Note]           NVARCHAR(500)  NULL,
        [CreatedAt]      DATETIME2      NOT NULL DEFAULT GETDATE(),

        CONSTRAINT [PK_InventoryLogs_LogId] PRIMARY KEY CLUSTERED ([LogId] ASC),

        CONSTRAINT [FK_InventoryLogs_Variants]
            FOREIGN KEY ([VariantId])
            REFERENCES [dbo].[ProductVariants] ([VariantId])
            ON DELETE CASCADE,

        CONSTRAINT [FK_InventoryLogs_Orders]
            FOREIGN KEY ([OrderId])
            REFERENCES [dbo].[Orders] ([OrderId])
            ON DELETE SET NULL,

        CONSTRAINT [FK_InventoryLogs_Users]
            FOREIGN KEY ([UserId])
            REFERENCES [dbo].[Users] ([UserId])
            ON DELETE SET NULL,
    );

    CREATE NONCLUSTERED INDEX [IX_InventoryLogs_VariantId]
        ON [dbo].[InventoryLogs] ([VariantId] ASC);

    CREATE NONCLUSTERED INDEX [IX_InventoryLogs_OrderId]
        ON [dbo].[InventoryLogs] ([OrderId] ASC);

    PRINT 'Table InventoryLogs created successfully.';
END
ELSE
BEGIN
    PRINT 'Table InventoryLogs already exists — skipping.';
END
