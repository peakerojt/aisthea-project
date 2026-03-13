import React, { useState, useRef, useEffect } from "react";
import { ProductCard } from "./ProductCard/ProductCard";

interface ChatWidgetProps {
    productId: number | null;
}

interface Message {
    role: "user" | "bot";
    content: string;
    products?: any[];
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ productId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "bot",
            content: "Hi 👋 I can help you choose size or suggest outfits.",
        },
    ]);
    const sessionIdRef = useRef(
        "user_" + Math.random().toString(36).substring(2, 8)
    );

    const bottomRef = useRef<HTMLDivElement | null>(null);

    // Auto scroll xuống dưới khi có tin nhắn mới
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };

        setMessages((prev) => [...prev, userMessage]);

        fetch("http://localhost:5000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sessionId: sessionIdRef.current,
                message: input,
                productId: productId,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                const botMessage: Message = {
                    role: "bot",
                    content: data.reply,
                    products: data.products || [],
                };

                setMessages((prev) => [...prev, botMessage]);
            });

        setInput("");
    };

    return (
        <>
            {/* Floating Button */}
            <div className="fixed bottom-6 right-6 z-50">
                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="bg-black text-white w-14 h-14 rounded-full shadow-lg hover:scale-110 transition"
                    >
                        💬
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="fixed bottom-6 right-6 w-80 h-[450px] bg-white text-black rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">

                    {/* Header */}
                    <div className="bg-black text-white p-3 flex justify-between items-center">
                        <span className="font-semibold">AISTHEA Stylist</span>
                        <button onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-3 overflow-y-auto text-sm space-y-2">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`p-2 rounded-lg max-w-[80%] ${msg.role === "user"
                                    ? "bg-black text-white self-end ml-auto"
                                    : "bg-gray-200 text-black"
                                    }`}
                            >
                                <div>{msg.content}</div>

                                {msg.products && msg.products.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        {msg.products.map((p) => (
                                            <ProductCard
                                                key={p.productId}
                                                id={String(p.productId)}
                                                name={p.name}
                                                price={Number(p.basePrice)}
                                                image={p.primaryImageUrl}
                                                className="scale-[0.8] origin-top-left"
                                                onClick={() => {
                                                    window.dispatchEvent(
                                                        new CustomEvent("openProductDetail", {
                                                            detail: { productId: p.productId }
                                                        })
                                                    );
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t p-2 flex">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            className="flex-1 border rounded-lg px-2 py-1 text-sm"
                            placeholder="Ask about size or style..."
                        />
                        <button
                            onClick={handleSend}
                            className="ml-2 bg-black text-white px-3 rounded-lg"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};