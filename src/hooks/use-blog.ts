import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE = `https://udutxbyzrdwucabxqvgg.supabase.co/functions/v1/public-api`;

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  tenant_id: string;
}

export interface BlogPost {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: { user_id: string; full_name: string; avatar_url: string | null } | null;
  tags?: BlogTag[];
}

// Public: list published posts
export function usePublicBlogPosts(page = 1, pageSize = 12, tag?: string) {
  return useQuery({
    queryKey: ["public-blog-posts", page, pageSize, tag],
    queryFn: async () => {
      let url = `${BASE}?action=list-blog-posts&page=${page}&pageSize=${pageSize}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar posts");
      return res.json() as Promise<{ data: BlogPost[]; total: number; page: number; pageSize: number; tags?: BlogTag[] }>;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Public: get single post by slug
export function usePublicBlogPost(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-blog-post", slug],
    queryFn: async () => {
      const res = await fetch(`${BASE}?action=get-blog-post&slug=${slug}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Erro ao buscar post");
      }
      return res.json() as Promise<BlogPost>;
    },
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}

// Public: list all tags
export function usePublicBlogTags() {
  return useQuery({
    queryKey: ["public-blog-tags"],
    queryFn: async () => {
      const res = await fetch(`${BASE}?action=list-blog-tags`);
      if (!res.ok) throw new Error("Erro ao buscar tags");
      return res.json() as Promise<BlogTag[]>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Admin: list all posts (including drafts)
export function useAdminBlogPosts() {
  return useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch tags for each post
      const postIds = (data || []).map(p => p.id);
      let tagMap: Record<string, BlogTag[]> = {};
      if (postIds.length > 0) {
        const { data: ptData } = await supabase
          .from("blog_post_tags")
          .select("post_id, tag_id, blog_tags(*)")
          .in("post_id", postIds);
        (ptData || []).forEach((pt: any) => {
          if (!tagMap[pt.post_id]) tagMap[pt.post_id] = [];
          if (pt.blog_tags) tagMap[pt.post_id].push(pt.blog_tags);
        });
      }

      return (data || []).map(p => ({ ...p, tags: tagMap[p.id] || [] })) as BlogPost[];
    },
  });
}

// Admin: create post
export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: { title: string; slug: string; excerpt?: string; content: string; cover_image_url?: string; published: boolean; tenant_id: string; author_id: string; tag_ids?: string[] }) => {
      const { tag_ids, ...rest } = post;
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          ...rest,
          published_at: rest.published ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;

      // Save tags
      if (tag_ids?.length) {
        const rows = tag_ids.map(tag_id => ({ post_id: data.id, tag_id }));
        await supabase.from("blog_post_tags").insert(rows);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["public-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["public-blog-post"] });
    },
  });
}

// Admin: update post
export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tag_ids, ...updates }: Partial<BlogPost> & { id: string; tag_ids?: string[] }) => {
      if (updates.published) {
        const { data: existing } = await supabase.from("blog_posts").select("published_at").eq("id", id).single();
        if (!existing?.published_at) {
          (updates as any).published_at = new Date().toISOString();
        }
      }
      const { data, error } = await supabase
        .from("blog_posts")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Update tags
      if (tag_ids !== undefined) {
        await supabase.from("blog_post_tags").delete().eq("post_id", id);
        if (tag_ids.length > 0) {
          const rows = tag_ids.map(tag_id => ({ post_id: id, tag_id }));
          await supabase.from("blog_post_tags").insert(rows);
        }
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["public-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["public-blog-post"] });
    },
  });
}

// Admin: delete post
export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["public-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["public-blog-post"] });
    },
  });
}

// Utility: generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
