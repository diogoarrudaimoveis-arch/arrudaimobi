import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Heading3, Palette, Undo, Redo, Code,
  Unlink, Variable, Building2, Search
} from "lucide-react";

export interface PropertyForTemplate {
  id: string;
  title: string;
  price: number;
  address: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  garages: number | null;
  purpose: string;
  currency: string | null;
  images: { url: string }[];
}

interface RichEmailEditorProps {
  content: string;
  onChange: (html: string) => void;
  properties?: PropertyForTemplate[];
}

const VARIABLES = [
  { key: "nome_cliente", label: "Nome do Cliente", group: "contato" },
  { key: "email_cliente", label: "E-mail do Cliente", group: "contato" },
];


function formatPrice(price: number, currency: string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
    minimumFractionDigits: 0,
  }).format(price);
}

function MenuBar({ editor, properties }: { editor: any; properties?: PropertyForTemplate[] }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [propertySearch, setPropertySearch] = useState("");

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      setLinkUrl("");
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
    }
  };

  const insertVariable = (key: string) => {
    editor.chain().focus().insertContent(`{{${key}}}`).run();
  };

  const insertPropertyBlock = (property: PropertyForTemplate) => {
    const imageHtml = property.images?.[0]?.url
      ? `<img src="${property.images[0].url}" alt="${property.title}" style="width:100%;max-width:560px;border-radius:8px;margin-bottom:12px;" />`
      : "";

    const address = [property.address, property.neighborhood, property.city, property.state]
      .filter(Boolean)
      .join(", ");

    const details = [
      property.bedrooms ? `${property.bedrooms} quarto(s)` : null,
      property.bathrooms ? `${property.bathrooms} banheiro(s)` : null,
      property.area ? `${property.area} m²` : null,
      property.garages ? `${property.garages} vaga(s)` : null,
    ].filter(Boolean).join(" · ");

    const purpose = property.purpose === "rent" ? "Aluguel" : "Venda";

    const block = `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;">
        ${imageHtml}
        <h3 style="margin:0 0 8px;font-size:18px;color:#111827;">${property.title}</h3>
        <p style="margin:0 0 4px;font-size:20px;font-weight:bold;color:#2563EB;">
          ${formatPrice(property.price, property.currency)}
        </p>
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">${purpose}</p>
        ${address ? `<p style="margin:0 0 4px;font-size:13px;color:#374151;">📍 ${address}</p>` : ""}
        ${details ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${details}</p>` : ""}
        <a href="{{link_imovel_${property.id}}}" style="display:inline-block;padding:10px 20px;background-color:#2563EB;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">Ver Imóvel</a>
      </div>
    `.trim();

    editor.chain().focus().insertContent(block).run();
  };

  const filteredProperties = (properties || []).filter((p) => {
    if (!propertySearch) return true;
    const q = propertySearch.toLowerCase();
    return p.title.toLowerCase().includes(q) ||
      (p.city || "").toLowerCase().includes(q) ||
      (p.neighborhood || "").toLowerCase().includes(q);
  });

  const colors = [
    "#000000", "#374151", "#6b7280", "#ef4444", "#f97316", "#eab308",
    "#22c55e", "#2563eb", "#8b5cf6", "#ec4899", "#ffffff",
  ];

  const ToolButton = ({ onClick, active, children, title }: any) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-8 w-8 p-0 ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5 rounded-t-md">
      {/* Undo / Redo */}
      <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
        <Undo className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
        <Redo className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1">
        <Heading1 className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2">
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3">
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text formatting */}
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico">
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
        <UnderlineIcon className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
        <Strikethrough className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar à esquerda">
        <AlignLeft className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
        <AlignCenter className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar à direita">
        <AlignRight className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
        <ListOrdered className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" title="Cor do texto">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-6 gap-1">
            {colors.map((color) => (
              <button key={color} type="button" className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => editor.chain().focus().setColor(color).run()} />
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => editor.chain().focus().unsetColor().run()}>
            Remover cor
          </Button>
        </PopoverContent>
      </Popover>

      {/* Link */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${editor.isActive("link") ? "bg-muted text-foreground" : "text-muted-foreground"}`} title="Link">
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-2">
          <Input placeholder="https://exemplo.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} />
          <div className="flex gap-2">
            <Button size="sm" onClick={addLink} className="flex-1">Inserir</Button>
            {editor.isActive("link") && (
              <Button size="sm" variant="outline" onClick={() => editor.chain().focus().unsetLink().run()}>
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Image */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" title="Imagem">
            <ImageIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-2">
          <Input placeholder="URL da imagem" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addImage()} />
          <Button size="sm" onClick={addImage} className="w-full">Inserir Imagem</Button>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Variables */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-muted-foreground" title="Inserir variável">
            <Variable className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">Variáveis</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] max-w-72 p-0" align="start">
          <ScrollArea className="max-h-[60vh]">
            <div className="p-2 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</p>
            </div>
            <div className="p-1">
              {VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded hover:bg-muted transition-colors text-left"
                >
                  <span className="truncate">{v.label}</span>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0 max-w-[120px] truncate">{`{{${v.key}}}`}</Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Property picker */}
      {properties && properties.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-muted-foreground" title="Inserir imóvel">
              <Building2 className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Imóveis</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-80 p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar imóvel..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="p-1">
                {filteredProperties.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum imóvel encontrado</p>
                ) : (
                  filteredProperties.map((property) => (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => insertPropertyBlock(property)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded hover:bg-muted transition-colors text-left"
                    >
                      {property.images?.[0]?.url ? (
                        <img
                          src={property.images[0].url}
                          alt={property.title}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{property.title}</p>
                        <p className="text-xs font-semibold text-primary">
                          {formatPrice(property.price, property.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[property.neighborhood, property.city].filter(Boolean).join(", ") || "Sem localização"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Bloco de código">
        <Code className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}

export default function RichEmailEditor({ content, onChange, properties }: RichEmailEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-4 py-3 min-h-[250px] focus:outline-none [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded",
      },
    },
  });

  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <MenuBar editor={editor} properties={properties} />
      <EditorContent editor={editor} />
    </div>
  );
}
