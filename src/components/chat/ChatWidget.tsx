import { useState, useRef, useEffect, useCallback } from "react";
import { createOmniRouteClient, type ChatMessage, type PropertyContext } from "@/integrations/omniroute/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Minimize2,
  Maximize2,
  Sparkles,
  Home,
  MapPin,
} from "lucide-react";

interface ChatWidgetProps {
  apiKey: string;
  propertyContext?: PropertyContext;
  tenantName?: string;
  position?: "bottom-right" | "bottom-left";
  welcomeMessage?: string;
}

const SYSTEM_PROMPT = `Você é o assistente virtual da imobiliária Arruda Imobi.
Seja simpático, prestativo e profissional.
Ajude o usuário a encontrar imóveis, responder dúvidas sobre imóveis específicos, agendar visitas e fornecer informações de contato.
Mantenha as respostas curtas e diretas (máximo 3-4 frases).
Sempre sugira agendar uma visita com um corretor quando apropriado.
Use emoji com moderação.
Responda em português brasileiro.`;

export function ChatWidget({
  apiKey,
  propertyContext,
  tenantName = "Arruda Imobi",
  position = "bottom-right",
  welcomeMessage,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const omniClient = useRef(createOmniRouteClient({ apiKey }));

  const defaultWelcome = welcomeMessage ||
    `Olá! 👋 Sou o assistente virtual da ${tenantName}. Como posso ajudá-lo hoje?`;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Initialize with welcome message when opened first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: defaultWelcome,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [isOpen, messages.length, defaultWelcome]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Build context-aware system message
      const systemWithContext = propertyContext
        ? `${SYSTEM_PROMPT}\n\nContexto do imóvel atual:\n- Tipo: ${propertyContext.tipo || "Não especificado"}\n- Bairro: ${propertyContext.bairro || "Não especificado"}\n- Preço: ${propertyContext.preco ? `R$ ${Number(propertyContext.preco).toLocaleString("pt-BR")}` : "Consulte"}\n- Quartos: ${propertyContext.dormitorios || 0}\n- Banheiros: ${propertyContext.banheiros || 0}\n- Vagas: ${propertyContext.vagas || 0}\n- Área: ${propertyContext.area || 0}m²`
        : SYSTEM_PROMPT;

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await omniClient.current.chat({
        messages: [
          { role: "system", content: systemWithContext },
          ...conversationHistory,
          { role: "user", content: text },
        ],
        temperature: 0.7,
        max_tokens: 600,
      });

      const reply = result.choices[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error("[ChatWidget] OmniRoute error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Ops! Ocorreu um erro. Tente novamente em instantes. 📞 Ou entre em contato pelo WhatsApp.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [input, isLoading, messages, propertyContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const positionClasses =
    position === "bottom-right"
      ? "bottom-6 right-6"
      : "bottom-6 left-6";

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses} z-50 flex items-center gap-3 px-5 py-3.5 
          bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full 
          shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 
          transition-all duration-300 hover:scale-105 group`}
        aria-label="Abrir chat"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="font-semibold text-sm">Chat</span>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed ${positionClasses} z-50 flex items-center gap-3 px-5 py-3.5 
          bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full 
          shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 
          transition-all duration-300 hover:scale-105`}
        aria-label="Abrir chat"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="font-semibold text-sm">Chat</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="ml-2 p-1 rounded-full hover:bg-blue-800 transition-colors"
          aria-label="Fechar chat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </button>
    );
  }

  return (
    <div
      className={`fixed ${positionClasses} z-50 flex flex-col 
        bg-[#1A1D27] rounded-2xl shadow-2xl border border-[#2A2D3C]
        transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in
        w-[380px] h-[560px]`}
      style={{ maxHeight: "calc(100vh - 80px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2D3C] bg-gradient-to-r from-[#1A1D27] to-[#1E2230] rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">{tenantName}</h3>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
              Online agora
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-lg hover:bg-[#212431] transition-colors text-gray-400 hover:text-white"
            aria-label="Minimizar"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-[#212431] transition-colors text-gray-400 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Property Context Banner */}
      {propertyContext && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#212431] border-b border-[#2A2D3C]">
          <Home className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-gray-300 truncate">
            {propertyContext.tipo} {propertyContext.bairro && `• ${propertyContext.bairro}`}
            {propertyContext.preco && ` • R$ ${Number(propertyContext.preco).toLocaleString("pt-BR")}`}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400 shrink-0">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            Contexto
          </Badge>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                ${msg.role === "user" ? "bg-blue-600" : "bg-[#212431] border border-[#2A2D3C]"}`}
            >
              {msg.role === "user" ? (
                <User className="h-3.5 w-3.5 text-white" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-blue-400" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-[#212431] text-gray-200 rounded-bl-md border border-[#2A2D3C]"
                }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-[#212431] border border-[#2A2D3C] flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="bg-[#212431] text-gray-400 rounded-2xl rounded-bl-md border border-[#2A2D3C] px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="flex gap-2 px-4 pb-2">
          {[
            "Ver imóveis à venda",
            "Agendar visita",
            "Falar no WhatsApp",
          ].map((action) => (
            <button
              key={action}
              onClick={() => setInput(action)}
              className="text-xs px-3 py-1.5 rounded-full border border-[#2A2D3C] text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-[#212431] transition-all"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#2A2D3C] bg-[#1A1D27] rounded-b-2xl">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[44px] max-h-[100px] resize-none bg-[#212431] border-[#2A2D3C] 
              text-gray-200 placeholder:text-gray-500 text-sm rounded-xl 
              focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-gray-600 mt-2 text-center">
          IA pode cometer erros — confirme informações importantes com um corretor
        </p>
      </div>
    </div>
  );
}

export default ChatWidget;