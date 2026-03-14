# Chatbot Enhancement Proposal Cho AISTHEA

## 1. Mục tiêu

Tài liệu này đề xuất hướng nâng cấp chatbot và các tính năng AI liên quan trong AISTHEA để biến các capability hiện có thành một trải nghiệm hỗ trợ mua sắm thống nhất hơn.

Hiện tại dự án đã có nền tảng tốt:

- Chatbot tư vấn trên trang chủ và trang chi tiết sản phẩm
- Trang `Stylist` gợi ý sản phẩm theo thời tiết
- Trang `Weather Outfit` sinh outfit recommendation bằng AI

Tuy nhiên các tính năng này đang vận hành như các điểm chạm riêng lẻ, chưa hình thành một "AISTHEA Assistant" đa ngữ cảnh xuyên suốt hành trình người dùng.

## 2. Hiện trạng hệ thống

### 2.1 Frontend entrypoints hiện có

Các entrypoint liên quan đến AI/chat hiện đang tồn tại trong frontend:

- `ChatWidget` xuất hiện ở trang chủ
- `ChatWidget` xuất hiện ở trang chi tiết sản phẩm
- Route `/stylist`
- Route `/weather-outfit`
- Route `/support`

Quan sát từ codebase:

- `ChatWidget` hiện nhận `page: 'home' | 'product'`
- Ở product detail, widget có thể nhận thêm `productId` và `productName`
- Trang `SupportPage` hiện là nội dung tĩnh theo section, chưa có AI hoặc chatbot support
- Trang `Stylist` hiện lấy dữ liệu thời tiết rồi lọc danh sách sản phẩm theo mùa/keyword
- Trang `WeatherOutfitPage` hiện lấy thời tiết rồi gọi AI để trả về outfit recommendation có cấu trúc

### 2.2 Backend APIs hiện có

Các API hiện phục vụ chatbot và AI stylist:

- `POST /api/chat`
- `GET /api/weather`
- `POST /api/outfit/recommend`

Vai trò từng API:

- `POST /api/chat`: xử lý hội thoại chatbot, phân loại intent, tạo câu trả lời và có thể trả thêm sản phẩm gợi ý
- `GET /api/weather`: lấy dữ liệu thời tiết theo `lat/lon` hoặc `city`
- `POST /api/outfit/recommend`: nhận dữ liệu thời tiết + hồ sơ mặc đồ để sinh outfit recommendation dạng JSON

### 2.3 AI provider hiện tại

Hệ thống hiện đang dùng 2 provider AI khác nhau:

- Chatbot dùng Cloudflare AI
- Weather outfit recommendation dùng OpenAI API

Trạng thái hiện tại theo code:

- Chatbot gọi Cloudflare Workers AI thông qua `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_MODEL`
- Outfit recommendation gọi OpenAI Chat Completions thông qua `OPENAI_API_KEY`, `OPENAI_MODEL`
- `MOCK_AI` cho phép backend trả mock JSON khi không muốn gọi OpenAI thật

### 2.4 Input/output và giới hạn hiện tại

#### Chatbot hiện tại

Input hiện có:

- `message: string`
- `page: 'home' | 'product'`
- `history: ChatHistoryMessage[]`
- `productId?: number`

Output hiện có:

- `reply: string`
- `intent: 'STYLE' | 'PRODUCT' | 'GENERAL'`
- `products: ChatProductRecommendation[]`

Các giới hạn đang tồn tại:

- Chatbot chỉ hỗ trợ đúng 2 page context: `home` và `product`
- Nếu `page = 'product'` mà thiếu `productId`, backend trả lỗi validation
- Validation cho `history` giới hạn tối đa 12 items
- Khi gửi sang Cloudflare, service chỉ dùng tối đa 8 history items gần nhất
- Số lượng product recommendation hiện tối đa 4
- Chatbot có fallback message khi Cloudflare lỗi, nhưng chưa có escalation flow sang support thật
- Intent hiện chỉ có 3 nhóm: `STYLE`, `PRODUCT`, `GENERAL`

#### AI stylist / weather outfit hiện tại

`WeatherOutfitPage` hiện:

- lấy thời tiết qua `/api/weather`
- thu thập profile cơ bản: `gender`, `style`, `tolerance`, `occasion`
- gọi `/api/outfit/recommend`
- nhận về JSON gồm `summary`, `items`, `tips`, `warnings`

`Stylist` hiện:

- dùng thời tiết để xác định seasonal context
- lọc sản phẩm theo keyword theo mùa
- chưa dùng chatbot hội thoại
- chưa chia sẻ context với `ChatWidget`

## 3. Vấn đề hiện tại

Mặc dù đã có nhiều capability AI, trải nghiệm hiện tại vẫn bị phân mảnh ở cả UX lẫn kiến trúc.

### 3.1 Phân mảnh hành trình người dùng

- Chatbot hiện chủ yếu hỗ trợ product discovery và styling cơ bản
- AI stylist nằm ở route riêng, không được chatbot dẫn dắt tự nhiên
- Weather outfit recommendation cũng nằm ở route riêng, không nối trực tiếp với luồng chat
- `/support` chưa tận dụng chatbot để xử lý FAQ hay định tuyến hỗ trợ

Điều này khiến người dùng phải tự đoán nên dùng tính năng nào ở từng thời điểm.

### 3.2 Phân mảnh context

- `ChatWidget` chỉ hiểu `home` và `product`
- `Stylist` không chia sẻ context với chatbot
- `WeatherOutfitPage` không chia sẻ lịch sử hay intent với chatbot
- Không có session memory ngắn hạn ở cấp assistant

Hệ quả là hệ thống chưa duy trì được một luồng hỗ trợ thống nhất từ khám phá sản phẩm đến tư vấn phối đồ và giải đáp hỗ trợ.

### 3.3 Phân mảnh kiến trúc AI

- Chatbot dùng Cloudflare AI
- Outfit recommendation dùng OpenAI
- Hai luồng prompt, fallback, logging và measurement đang tách rời

Kiến trúc này chạy được ở quy mô hiện tại, nhưng sẽ khó mở rộng nếu muốn thêm các bối cảnh như support, order help, FAQ handoff hoặc personalized recommendations.

### 3.4 Khoảng trống về đo lường và tối ưu

Hiện chưa thấy lớp đo lường rõ ràng cho:

- tỷ lệ người dùng mở chat
- tỷ lệ click sản phẩm từ recommendation card
- tỷ lệ chuyển sang `/stylist` hoặc `/weather-outfit`
- tỷ lệ fallback khi AI lỗi
- chất lượng intent classification
- hiệu quả giảm tải cho support

Ngoài ra, hệ thống cũng chưa có feedback loop để học từ câu hỏi người dùng hoặc tối ưu prompt theo use case thực tế.

## 4. Đề xuất enhancement

### 4.1 Hướng sản phẩm

Đề xuất hợp nhất các capability hiện có thành một lớp trải nghiệm chung: **AISTHEA Assistant**.

Mục tiêu của assistant này:

- giúp người dùng khám phá sản phẩm
- tư vấn phối đồ theo ngữ cảnh
- gợi ý outfit theo thời tiết
- dẫn người dùng sang đúng flow support khi cần

Thay vì xem chatbot, stylist và weather outfit là các tính năng rời rạc, hệ thống nên xem chúng là các mode khác nhau của cùng một assistant.

### 4.2 Mở rộng phạm vi chatbot

Đề xuất mở rộng chatbot từ `home/product` sang thêm các ngữ cảnh:

- `stylist`
- `support`

Ý nghĩa của việc mở rộng:

- ở `stylist`, chatbot có thể chuyển từ màn hình gợi ý tĩnh sang tư vấn hội thoại
- ở `support`, chatbot có thể trả lời FAQ cơ bản và điều hướng người dùng tới đúng section hoặc contact channel

Lưu ý: đây là **đề xuất**, chưa phải capability hiện có.

### 4.3 Mở rộng hệ intent

Intent hiện tại đủ cho giai đoạn đầu nhưng còn quá hẹp. Proposal đề xuất mở rộng thành các nhóm rõ hơn:

- `product_discovery`
- `styling_advice`
- `weather_aware_recommendation`
- `support_faq_handoff`

Lợi ích:

- prompt rõ ràng hơn
- decision routing dễ kiểm soát hơn
- telemetry và A/B prompt tuning dễ thực hiện hơn

### 4.4 CTA liên kết chéo giữa các tính năng

Assistant nên chủ động đề xuất bước tiếp theo phù hợp thay vì chỉ trả lời text.

Các CTA nên có:

- từ chatbot sang `/product/:id`
- từ chatbot sang `/stylist`
- từ chatbot sang `/weather-outfit`
- từ chatbot sang `/support?section=...`

Ví dụ:

- nếu người dùng hỏi "Hôm nay Sài Gòn nóng mặc gì?" thì assistant nên đề xuất sang flow weather outfit
- nếu người dùng hỏi "Tôi muốn đổi trả thế nào?" thì assistant nên dẫn sang `/support?section=returns`
- nếu người dùng đang ở product detail và muốn xem item tương tự, assistant nên hiển thị product cards như hiện tại nhưng có thể bổ sung CTA rõ hơn

### 4.5 Lớp orchestration chung cho AI

Không cần thay provider ngay. Proposal nên giữ thế mạnh hiện có:

- tiếp tục dùng Cloudflare cho chat cần tốc độ phản hồi nhanh
- tiếp tục dùng OpenAI cho output JSON có cấu trúc trong outfit recommendation

Nhưng cần thêm một lớp orchestration chung để chuẩn hóa:

- routing theo intent/ngữ cảnh
- quản lý prompt ownership
- fallback behavior
- telemetry và error reporting
- contract giữa frontend và backend cho assistant responses

Mục tiêu là giảm việc mỗi tính năng AI tự phát triển một flow riêng.

## 5. Roadmap đề xuất

### Phase 1: Quick Wins

Mục tiêu: tận dụng nền tảng hiện có với thay đổi nhỏ nhưng tác động UX rõ ràng.

- mở rộng chatbot sang `support` và `stylist`
- bổ sung CTA liên kết chéo giữa chatbot, stylist và weather outfit
- chuẩn hóa copy hiển thị assistant trên các entrypoint
- chuẩn hóa fallback message khi provider lỗi
- bổ sung event tracking cơ bản cho open chat, send message, recommendation click

### Phase 2: Contextual Assistant

Mục tiêu: làm assistant hiểu ngữ cảnh tốt hơn thay vì chỉ phản hồi từng request đơn lẻ.

- thêm shared intent router
- thêm session memory ngắn hạn
- cho phép assistant tận dụng weather context, page context và product context cùng lúc
- bổ sung support handoff rõ ràng hơn
- nâng recommendation từ "trả danh sách item" thành "gợi ý có lý do"

### Phase 3: Optimization

Mục tiêu: biến assistant thành kênh tăng chuyển đổi và giảm friction thực sự.

- xây dashboard analytics cho AI flows
- thu thập feedback của người dùng sau chat/recommendation
- tối ưu prompt theo từng use case
- tiến tới personalization theo hành vi duyệt sản phẩm hoặc lịch sử mua hàng

Lưu ý: personalization và memory sâu là định hướng tương lai, hiện chưa có trong codebase.

## 6. Chỉ số nên đo lường

Để proposal có thể đánh giá hiệu quả sau triển khai, nên định nghĩa trước các KPI:

- `chat_start_rate`
- `message_to_reply_success_rate`
- `fallback_error_rate`
- `product_recommendation_ctr`
- `stylist_page_conversion`
- `weather_outfit_conversion`
- `support_deflection_rate`

Ngoài ra có thể theo dõi thêm:

- intent distribution
- average messages per session
- top unresolved user questions

## 7. Public APIs và interfaces cần tài liệu hóa

Proposal này không thay đổi code hay public API. Tuy nhiên cần tài liệu hóa rõ các interface hiện có để làm baseline cho lần triển khai sau.

### APIs hiện có

- `POST /api/chat`
- `GET /api/weather`
- `POST /api/outfit/recommend`

### Chat interfaces hiện có

```ts
type ChatPage = 'home' | 'product';
type ChatIntent = 'STYLE' | 'PRODUCT' | 'GENERAL';
```

```ts
interface ChatRequestDto {
  message: string;
  page: ChatPage;
  history: ChatHistoryMessage[];
  productId?: number;
}

interface ChatResponseDto {
  reply: string;
  intent: ChatIntent;
  products: ChatProductRecommendation[];
}
```

### Env liên quan

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_AI_MODEL`
- `WEATHER_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `MOCK_AI`

## 8. Phân biệt rõ giữa hiện trạng và đề xuất

Để tránh hiểu nhầm khi team đọc tài liệu:

### Những gì đã có trong dự án

- Chatbot trên `home` và `product`
- Product recommendation cards từ chatbot
- Weather API
- Outfit recommendation bằng OpenAI
- Trang `Stylist`
- Trang `Support` dạng nội dung tĩnh

### Những gì mới là đề xuất

- AISTHEA Assistant đa ngữ cảnh
- chatbot cho `stylist` và `support`
- intent router mở rộng
- shared session memory
- support handoff
- telemetry/dashboard chuyên biệt cho AI
- feedback loop và personalization

## 9. Kết luận

AISTHEA không bắt đầu từ con số 0. Dự án đã có sẵn các viên gạch quan trọng cho chatbot commerce và AI stylist, gồm chat trên storefront, recommendation theo sản phẩm, weather service và outfit generation có cấu trúc.

Vấn đề hiện tại không nằm ở việc thiếu AI, mà ở chỗ các capability AI đang đứng riêng lẻ. Vì vậy, hướng enhancement phù hợp không phải là thêm một tính năng AI mới tách biệt, mà là hợp nhất những gì đã có thành một lớp trợ lý thống nhất, có khả năng điều hướng người dùng giữa commerce, stylist và support.

Đây là lý do proposal này xem chatbot enhancement như một bước nối chiến lược giữa:

- khám phá sản phẩm
- tư vấn phong cách
- recommendation theo thời tiết
- hỗ trợ sau mua và FAQ

Nếu triển khai theo roadmap đề xuất, AISTHEA có thể chuyển từ "có vài tính năng AI" sang "có một assistant phục vụ rõ ràng cho hành trình mua sắm".
