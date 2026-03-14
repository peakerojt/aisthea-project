const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath, callback);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            callback(fullPath);
        }
    });
}

walk(srcDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains an import from orderApi
    if (content.includes('orderApi') && !filePath.includes('orderApi.ts') && !filePath.includes('order.service.ts') && !filePath.includes('order.api.ts')) {
        let originalContent = content;
        
        // 1. Replace the import path
        content = content.replace(/from\s+['"]([^'"]+)orderApi['"]/g, "from '$1order.service'");
        
        // 2. Map the old function names to the new orderService method names
        content = content.replace(/fetchOrderDetail\(/g, "orderService.fetchOrderDetail(");
        content = content.replace(/cancelOrder\(/g, "orderService.cancelOrderUser(");
        content = content.replace(/confirmReceipt\(/g, "orderService.confirmReceipt(");
        
        // 3. Remove the destructured function imports, keep types. 
        // Example: import { fetchOrderDetail, cancelOrder, OrderDetail } from '@/common/services/order.service';
        // Needs to become: import { OrderDetail } from '@/common/services/order.service'; import { orderService } from '@/common/services/order.service';
        
        if (content.includes('orderService.fetchOrderDetail') || content.includes('orderService.cancelOrderUser') || content.includes('orderService.confirmReceipt')) {
            // Add the orderService import if it's missing (dirty but effective regex)
            const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"][^'"]+order\.service['"]/);
            if(importMatch) {
               let updatedImports = importMatch[1]
                 .replace('fetchOrderDetail', '')
                 .replace('cancelOrder', '')
                 .replace('confirmReceipt', '')
                 .split(',')
                 .map(s => s.trim())
                 .filter(s => s.length > 0)
                 .join(', ');
                 
               // remove trailing commas
               updatedImports = updatedImports.replace(/,\s*$/, "");
               
               let newImportStatement = `import { ${updatedImports}${updatedImports.length > 0 ? ', ' : ''}orderService } from '@/common/services/order.service';`;
               content = content.replace(importMatch[0], newImportStatement);
            }
        }

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content);
            console.log(`Updated: ${filePath}`);
        }
    }
});

// Finally delete orderApi.ts
const orderApiPath = path.join(srcDir, 'common/services/orderApi.ts');
if (fs.existsSync(orderApiPath)) {
    fs.unlinkSync(orderApiPath);
    console.log('Deleted orderApi.ts');
}
