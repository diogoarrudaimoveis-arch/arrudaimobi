import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateSlug } from "@/hooks/use-blog";

interface BlogTag {
  id: string;
  name: string;
  slug: string;
  tenant_id: string;
}

interface BlogTagInputProps {
  tenantId: string;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}

export function BlogTagInput({ tenantId, selectedTagIds, onChange }: BlogTagInputProps) {
  const [allTags, setAllTags] = useState<BlogTag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTags();
  }, [tenantId]);

  async function loadTags() {
    const { data } = await supabase
      .from("blog_tags")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setAllTags(data as BlogTag[]);
  }

  async function handleCreate() {
    const name = newTag.trim();
    if (!name) return;
    const slug = generateSlug(name);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_tags")
        .insert({ name, slug, tenant_id: tenantId })
        .select()
        .single();
      if (error) {
        if (error.message.includes("duplicate")) {
          toast({ title: "Tag já existe", variant: "destructive" });
        } else throw error;
        return;
      }
      setAllTags(prev => [...prev, data as BlogTag].sort((a, b) => a.name.localeCompare(b.name)));
      onChange([...selectedTagIds, (data as BlogTag).id]);
      setNewTag("");
    } catch (err) {
      toast({ title: "Erro ao criar tag", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter(t => t !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing tags */}
      <div className="flex flex-wrap gap-1.5">
        {allTags.map(tag => {
          const selected = selectedTagIds.includes(tag.id);
          return (
            <Badge
              key={tag.id}
              variant={selected ? "default" : "outline"}
              className="cursor-pointer text-xs transition-colors"
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
              {selected && <X className="h-3 w-3 ml-1" />}
            </Badge>
          );
        })}
        {allTags.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma tag cadastrada</p>
        )}
      </div>

      {/* Create new */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova tag..."
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          className="text-sm h-8"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleCreate} disabled={loading || !newTag.trim()} className="gap-1 h-8 shrink-0">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Criar
        </Button>
      </div>
    </div>
  );
}
