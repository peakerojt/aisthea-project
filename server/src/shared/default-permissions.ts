export type DefaultPermissionSeed = {
  code: string;
  module: string;
  description: string;
};

export const DEFAULT_PERMISSION_CATALOG: DefaultPermissionSeed[] = [
  { code: 'VIEW_PRODUCT', module: 'PRODUCT', description: 'Xem danh sách và chi tiết sản phẩm' },
  { code: 'CREATE_PRODUCT', module: 'PRODUCT', description: 'Thêm sản phẩm mới' },
  { code: 'EDIT_PRODUCT', module: 'PRODUCT', description: 'Sửa thông tin sản phẩm' },
  { code: 'DELETE_PRODUCT', module: 'PRODUCT', description: 'Xóa sản phẩm' },
  { code: 'VIEW_ORDER', module: 'ORDER', description: 'Xem danh sách và chi tiết đơn hàng' },
  { code: 'EDIT_ORDER', module: 'ORDER', description: 'Cập nhật trạng thái đơn hàng' },
  { code: 'VIEW_INVENTORY', module: 'INVENTORY', description: 'Xem tồn kho và lịch sử nhập kho' },
  { code: 'EDIT_INVENTORY', module: 'INVENTORY', description: 'Cập nhật số lượng tồn kho' },
  { code: 'VIEW_CUSTOMER', module: 'CUSTOMER', description: 'Xem danh sách khách hàng' },
  { code: 'EDIT_CUSTOMER', module: 'CUSTOMER', description: 'Chỉnh sửa thông tin khách hàng' },
  {
    code: 'CUSTOMER_BANK_ACCOUNT_MANAGE',
    module: 'CUSTOMER',
    description: 'Quản lý tài khoản ngân hàng nhận hoàn tiền của khách hàng',
  },
  { code: 'VIEW_REVENUE', module: 'REVENUE', description: 'Xem báo cáo doanh thu và phân tích' },
  { code: 'MANAGE_COUPON', module: 'COUPON', description: 'Thêm, sửa, xóa mã giảm giá' },
  {
    code: 'REFUND_BENEFIT_VIEW',
    module: 'COUPON',
    description: 'Xem danh sách ưu đãi hoàn tiền đã phát hành',
  },
  { code: 'VIEW_RETURNS', module: 'RETURNS', description: 'Xem danh sách và chi tiết yêu cầu hoàn trả' },
  { code: 'MANAGE_RETURNS', module: 'RETURNS', description: 'Xử lý các bước vận hành của quy trình hoàn trả' },
  {
    code: 'RETURN_REFUND_FINANCE_VIEW',
    module: 'RETURN',
    description: 'Xem chi tiết thông tin tài chính của yêu cầu hoàn tiền',
  },
  {
    code: 'RETURN_REFUND_FINANCE_COMPLETE',
    module: 'RETURN',
    description: 'Xác nhận hoàn tiền chuyển khoản và tải chứng từ',
  },
];
