import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Sparkles,
  Upload,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  RefreshCw,
  Share2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  validateMediaFile,
  generateSecureFilename,
  generateVideoThumbnail,
  parseExternalVideoEmbed,
  MediaItem,
} from "@/lib/security/mediaValidation";
import {
  PostCategory,
  DisclaimerType,
  PostType,
  POST_CATEGORIES,
  CMA_DISCLAIMERS,
  getDefaultDisclaimerForCategory,
  getDisclaimerText,
} from "@/lib/compliance/cmaDisclaimers";

interface AdminPersona {
  id: string;
  name: string;
  avatar_url: string;
  badge_title: string | null;
  is_default: boolean;
  created_at: string;
}

export default function AdminPostsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"compose" | "posts" | "personas">("compose");

  // Post form state
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("custom");
  const [customAuthorName, setCustomAuthorName] = useState("");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("market_update");
  const [postType, setPostType] = useState<PostType>("both");
  const [disclaimerType, setDisclaimerType] = useState<DisclaimerType>("cma_standard");
  const [storyDurationHours, setStoryDurationHours] = useState<string>("0"); // 0 = permanent
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [embedInputUrl, setEmbedInputUrl] = useState("");
  const [odpcConsentConfirmed, setOdpcConsentConfirmed] = useState(false);
  const [crossPostToSocial, setCrossPostToSocial] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");

  // Persona management form
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaBadge, setNewPersonaBadge] = useState("");
  const [newPersonaAvatarUrl, setNewPersonaAvatarUrl] = useState("");
  const [newPersonaIsDefault, setNewPersonaIsDefault] = useState(false);

  // Queries
  const { data: personas = [], isLoading: isLoadingPersonas } = useQuery({
    queryKey: ["admin_personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_personas")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as AdminPersona[];
    },
  });

  const { data: posts = [], isLoading: isLoadingPosts, refetch: refetchPosts } = useQuery({
    queryKey: ["admin_posts_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_posts")
        .select(`
          *,
          persona:persona_id (
            id,
            name,
            avatar_url,
            badge_title
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Automatically select default persona if none selected
  React.useEffect(() => {
    if (selectedPersonaId === "custom" && personas.length > 0) {
      const def = personas.find((p) => p.is_default);
      if (def) {
        setSelectedPersonaId(def.id);
      }
    }
  }, [personas, selectedPersonaId]);

  // Handle Category changes: automatically update default disclaimer
  const handleCategoryChange = (cat: PostCategory) => {
    setCategory(cat);
    setDisclaimerType(getDefaultDisclaimerForCategory(cat));
  };

  // Upload handler for photos & native videos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgressMsg("Validating binary headers and security checks…");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = await validateMediaFile(file);

        if (!validation.valid || !validation.safeExtension || !validation.detectedMime) {
          toast.error(validation.error || `Invalid file ${file.name}`);
          continue;
        }

        const safeFilename = generateSecureFilename(validation.safeExtension);
        const filePath = `${safeFilename}`;

        setUploadProgressMsg(`Uploading ${file.name} to secure storage…`);

        // Upload main media
        const { error: uploadError } = await supabase.storage
          .from("admin-media")
          .upload(filePath, file, {
            contentType: validation.detectedMime,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          toast.error(`Upload failed: ${uploadError.message}`);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("admin-media")
          .getPublicUrl(filePath);

        const mediaUrl = publicUrlData.publicUrl;

        // If native video: extract frame thumbnail to avoid black box
        let thumbnailUrl: string | undefined = undefined;
        let videoDuration: number | undefined = undefined;

        if (validation.mediaType === "video") {
          setUploadProgressMsg("Generating video frame thumbnail…");
          const thumbResult = await generateVideoThumbnail(file, 0.5);
          if (thumbResult.thumbnailBlob) {
            const thumbFilename = generateSecureFilename("webp");
            const { error: thumbUploadError } = await supabase.storage
              .from("admin-media")
              .upload(thumbFilename, thumbResult.thumbnailBlob, {
                contentType: "image/webp",
                cacheControl: "3600",
                upsert: false,
              });

            if (!thumbUploadError) {
              const { data: thumbUrlData } = supabase.storage
                .from("admin-media")
                .getPublicUrl(thumbFilename);
              thumbnailUrl = thumbUrlData.publicUrl;
            }
          }
          videoDuration = thumbResult.duration;
        }

        setMediaItems((prev) => [
          ...prev,
          {
            type: validation.mediaType || "image",
            url: mediaUrl,
            thumbnail_url: thumbnailUrl,
            mime_type: validation.detectedMime,
            duration: videoDuration,
          },
        ]);

        toast.success(`Uploaded ${file.name} successfully`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Media processing error: ${message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg("");
      e.target.value = "";
    }
  };

  // Add external video embed (YouTube / Vimeo / Loom)
  const handleAddVideoEmbed = () => {
    if (!embedInputUrl) return;
    const embed = parseExternalVideoEmbed(embedInputUrl);
    if (!embed.isEmbed || !embed.embedUrl) {
      toast.error("Please enter a valid YouTube, Vimeo, or Loom video link.");
      return;
    }

    setMediaItems((prev) => [
      ...prev,
      {
        type: "embed",
        url: embed.embedUrl,
        mime_type: "video/embed",
      },
    ]);
    setEmbedInputUrl("");
    toast.success("Video embed link added.");
  };

  // Remove attached media
  const handleRemoveMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Create Post Mutation
  const createPostMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (!content.trim()) {
        throw new Error("Post text or caption is required.");
      }
      if (!odpcConsentConfirmed && mediaItems.length > 0) {
        throw new Error("Please confirm compliance with Kenya Data Protection Act (ODPC) for attached media.");
      }

      const activePersona = personas.find((p) => p.id === selectedPersonaId);
      const personaId = activePersona ? activePersona.id : null;
      const authorName = activePersona ? activePersona.name : customAuthorName.trim() || "Admin";
      const authorAvatar = activePersona ? activePersona.avatar_url : customAvatarUrl.trim() || "";

      let expiresAt: string | null = null;
      const hours = parseInt(storyDurationHours, 10);
      if (hours > 0) {
        const expDate = new Date();
        expDate.setHours(expDate.getHours() + hours);
        expiresAt = expDate.toISOString();
      }

      const payload = {
        author_user_id: user?.id || null,
        persona_id: personaId,
        custom_author_name: personaId ? null : authorName,
        custom_avatar_url: personaId ? null : authorAvatar,
        title: title.trim() || null,
        content: content.trim(),
        post_type: postType,
        category,
        media: mediaItems,
        disclaimer_type: disclaimerType,
        is_published: !isDraft,
        expires_at: expiresAt,
      };

      const { data, error } = await supabase.from("admin_posts").insert([payload]).select().single();
      if (error) throw error;

      // Cross-post bridge to social_posts if requested
      if (crossPostToSocial && !isDraft) {
        try {
          const hashtags = ["#KenyaInvesting", "#KenyaFunds", "#Nairobi"];
          if (category === "market_update") hashtags.push("#KenyaMarkets", "#MMF");
          if (category === "educational") hashtags.push("#FinancialLiteracy");

          const socialPayload = {
            content_type: "admin_broadcast",
            platform: "x" as const,
            caption: content.trim(),
            hashtags,
            disclaimer: getDisclaimerText(disclaimerType),
            status: "draft" as const,
            fund_ids: [],
            fund_names: [],
            yield_values: {},
            source_data: { admin_post_id: data.id },
            image_url: mediaItems[0]?.url || null,
          };

          await supabase.from("social_posts").insert([socialPayload]);
          toast.info("Queued a draft copy into Social Media Studio (X/Twitter).");
        } catch {
          // Non-blocking cross-post failure
        }
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.is_published ? "Post published successfully!" : "Post saved as draft.");
      // Reset form
      setTitle("");
      setContent("");
      setMediaItems([]);
      setEmbedInputUrl("");
      setOdpcConsentConfirmed(false);
      setCrossPostToSocial(false);
      queryClient.invalidateQueries({ queryKey: ["admin_posts_all"] });
      queryClient.invalidateQueries({ queryKey: ["admin_posts_public"] });
      setActiveTab("posts");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Error creating post";
      toast.error(message);
    },
  });

  // Create Persona Mutation
  const createPersonaMutation = useMutation({
    mutationFn: async () => {
      if (!newPersonaName.trim()) throw new Error("Persona name is required.");
      if (!newPersonaAvatarUrl.trim()) throw new Error("Avatar URL is required.");

      const { data, error } = await supabase
        .from("admin_personas")
        .insert([
          {
            name: newPersonaName.trim(),
            avatar_url: newPersonaAvatarUrl.trim(),
            badge_title: newPersonaBadge.trim() || null,
            is_default: newPersonaIsDefault,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newPersona) => {
      toast.success(`Created persona '${newPersona.name}'`);
      queryClient.invalidateQueries({ queryKey: ["admin_personas"] });
      setSelectedPersonaId(newPersona.id);
      setIsPersonaModalOpen(false);
      setNewPersonaName("");
      setNewPersonaBadge("");
      setNewPersonaAvatarUrl("");
      setNewPersonaIsDefault(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to create persona";
      toast.error(message);
    },
  });

  // Toggle post published status
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from("admin_posts")
        .update({ is_published: isPublished })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_posts_all"] });
      queryClient.invalidateQueries({ queryKey: ["admin_posts_public"] });
      toast.success("Post status updated");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    },
  });

  // Delete post
  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_posts_all"] });
      queryClient.invalidateQueries({ queryKey: ["admin_posts_public"] });
      toast.success("Post deleted");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to delete post";
      toast.error(message);
    },
  });

  // Active persona data for live preview
  const currentPersona = personas.find((p) => p.id === selectedPersonaId);
  const previewAuthorName = currentPersona ? currentPersona.name : customAuthorName.trim() || "Admin";
  const previewAvatarUrl =
    currentPersona?.avatar_url ||
    customAvatarUrl.trim() ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  const previewBadge = currentPersona?.badge_title || "Official";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Admin Posts & Stories Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Publish verified multimedia announcements, stories, and market updates with automatic CMA compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin_posts_all"] });
              queryClient.invalidateQueries({ queryKey: ["admin_personas"] });
              toast.info("Refreshed data");
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("compose")}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Post
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="compose">Composer</TabsTrigger>
          <TabsTrigger value="posts">All Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="personas">Personas ({personas.length})</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: COMPOSER ────────────────────────────────────────────── */}
        <TabsContent value="compose" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Editor Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Persona Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Author Persona
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setIsPersonaModalOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Persona
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Choose which avatar and identity represents this post.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Select Persona</Label>
                      <Select
                        value={selectedPersonaId}
                        onValueChange={setSelectedPersonaId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose author" />
                        </SelectTrigger>
                        <SelectContent>
                          {personas.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.badge_title ? `(${p.badge_title})` : ""}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Custom Persona (This Post Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPersonaId === "custom" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Custom Name</Label>
                        <Input
                          placeholder="e.g. Marko / Founder"
                          value={customAuthorName}
                          onChange={(e) => setCustomAuthorName(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {selectedPersonaId === "custom" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Custom Avatar Image URL</Label>
                      <Input
                        placeholder="https://... (or upload below)"
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Content & Categorization */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Post Details</CardTitle>
                  <CardDescription className="text-xs">
                    Provide the headline, content, and category for this broadcast.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Category</Label>
                      <Select
                        value={category}
                        onValueChange={(v) => handleCategoryChange(v as PostCategory)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(POST_CATEGORIES).map((cat) => (
                            <SelectItem key={cat.key} value={cat.key}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Surface</Label>
                      <Select
                        value={postType}
                        onValueChange={(v) => setPostType(v as PostType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Stories & Feed (Both)</SelectItem>
                          <SelectItem value="story">Stories Ring Only</SelectItem>
                          <SelectItem value="feed">Feed Stream Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Story Expiration</Label>
                      <Select
                        value={storyDurationHours}
                        onValueChange={setStoryDurationHours}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Permanent (No expiry)</SelectItem>
                          <SelectItem value="24">Expires in 24 Hours</SelectItem>
                          <SelectItem value="48">Expires in 48 Hours</SelectItem>
                          <SelectItem value="168">Expires in 7 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Headline / Title (Optional)</Label>
                    <Input
                      placeholder="e.g. November MMF Yield Shakeup: Top Gainers"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Post Content / Caption</Label>
                      <span className="text-[10px] text-muted-foreground">
                        {content.length} characters
                      </span>
                    </div>
                    <Textarea
                      placeholder="Share market insights, announcements, or analysis..."
                      className="min-h-[140px] resize-y"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Media Attachments & Security */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      Media Attachments (Photos & Videos)
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Safe Storage RLS
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Upload photos (max 10MB) or native MP4/WebM videos (max 100MB). Video thumbnails are generated automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upload Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-dashed rounded-lg p-4 text-center hover:bg-muted/40 transition">
                      <input
                        type="file"
                        id="media-file-input"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                        multiple
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="media-file-input"
                        className="cursor-pointer flex flex-col items-center justify-center space-y-1"
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {isUploading ? "Processing..." : "Upload Photo or Video"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          JPG, PNG, WebP, MP4, WebM
                        </span>
                      </label>
                    </div>

                    <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Or Link External Video
                      </Label>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="YouTube or Vimeo URL"
                          className="h-8 text-xs"
                          value={embedInputUrl}
                          onChange={(e) => setEmbedInputUrl(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs px-2.5"
                          onClick={handleAddVideoEmbed}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Supports YouTube, Vimeo, and Loom embeds.
                      </p>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="text-xs text-primary flex items-center gap-2 bg-primary/10 p-2.5 rounded">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {uploadProgressMsg}
                    </div>
                  )}

                  {/* Attached Media List */}
                  {mediaItems.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-medium">
                        Attached Items ({mediaItems.length})
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {mediaItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="relative group border rounded-md overflow-hidden bg-muted aspect-video flex items-center justify-center"
                          >
                            {item.type === "image" && (
                              <img
                                src={item.url}
                                alt="Attachment"
                                className="w-full h-full object-cover"
                              />
                            )}
                            {item.type === "video" && (
                              <div className="w-full h-full relative">
                                <img
                                  src={item.thumbnail_url || item.url}
                                  alt="Video thumb"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Video className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            )}
                            {item.type === "embed" && (
                              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white text-xs p-2 text-center">
                                <Video className="h-5 w-5 mb-1 text-primary" />
                                <span className="line-clamp-1 text-[10px]">Video Embed</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(idx)}
                              className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-full opacity-80 group-hover:opacity-100 transition shadow"
                              title="Remove item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Regulatory Compliance & Safety Checklist */}
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <ShieldCheck className="h-4 w-4" />
                    Regulatory Compliance & Protections
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-600/90 dark:text-amber-400/80">
                    Automated safeguards to protect against CMA unlicensed advice scrutiny and ODPC liability.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Compliance Disclaimer Attachment</Label>
                    <Select
                      value={disclaimerType}
                      onValueChange={(v) => setDisclaimerType(v as DisclaimerType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cma_standard">Standard CMA Market Disclosure</SelectItem>
                        <SelectItem value="educational">Educational Content Only</SelectItem>
                        <SelectItem value="opinion">Market Opinion / Observation</SelectItem>
                        <SelectItem value="none">None (Platform Announcements Only)</SelectItem>
                      </SelectContent>
                    </Select>
                    {disclaimerType !== "none" && (
                      <p className="text-[11px] text-muted-foreground bg-background/80 p-2.5 rounded border border-border/50 italic">
                        &quot;{getDisclaimerText(disclaimerType)}&quot;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-amber-500/10 space-y-3">
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={odpcConsentConfirmed}
                        onChange={(e) => setOdpcConsentConfirmed(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-muted-foreground leading-snug">
                        I confirm this post and any media adhere to the <strong>Kenya Data Protection Act 2019 (ODPC)</strong>, do not infringe individual likeness/privacy rights, and do not contain deceptive market rumors.
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={crossPostToSocial}
                        onChange={(e) => setCrossPostToSocial(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 text-primary" />
                        Also queue a draft copy into Social Media Studio (X/Twitter)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => createPostMutation.mutate(true)}
                      disabled={createPostMutation.isPending || isUploading}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      onClick={() => createPostMutation.mutate(false)}
                      disabled={createPostMutation.isPending || isUploading}
                      className="bg-primary text-primary-foreground min-w-[120px]"
                    >
                      {createPostMutation.isPending ? "Publishing…" : "Publish Broadcast"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-20 space-y-6">
                {/* 1. Story Avatar Bubble Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Live Preview: Story Bubble
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center p-6 bg-muted/20 border-t">
                    <div className="flex flex-col items-center cursor-pointer group">
                      <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-primary">
                        <div className="p-0.5 bg-background rounded-full">
                          <img
                            src={previewAvatarUrl}
                            alt="Avatar preview"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium mt-1.5 max-w-[80px] truncate text-center">
                        {previewAuthorName}
                      </span>
                      <span className="text-[10px] text-primary font-semibold">
                        {previewBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-4 text-center">
                      This is how your avatar appears in the top story reel on Homepage & Markets.
                    </p>
                  </CardContent>
                </Card>

                {/* 2. Story Modal Card Preview */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Live Preview: Story Card / Viewer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 border-t">
                    <div className="bg-card p-4 space-y-3">
                      {/* Author Header */}
                      <div className="flex items-center gap-3">
                        <img
                          src={previewAvatarUrl}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold truncate">
                              {previewAuthorName}
                            </span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {previewBadge}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Just now • {POST_CATEGORIES[category].label}
                          </span>
                        </div>
                      </div>

                      {/* Title & Content */}
                      {title && (
                        <h4 className="text-sm font-bold tracking-tight">
                          {title}
                        </h4>
                      )}
                      <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {content || "Your post content preview will show here..."}
                      </p>

                      {/* Media Preview */}
                      {mediaItems.length > 0 && (
                        <div className="rounded-lg overflow-hidden border bg-muted aspect-video flex items-center justify-center">
                          {mediaItems[0].type === "image" && (
                            <img
                              src={mediaItems[0].url}
                              alt="Media"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {mediaItems[0].type === "video" && (
                            <div className="relative w-full h-full">
                              <img
                                src={mediaItems[0].thumbnail_url || mediaItems[0].url}
                                alt="Thumb"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Video className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          )}
                          {mediaItems[0].type === "embed" && (
                            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white text-xs">
                              <Video className="h-6 w-6 text-primary mb-1" />
                              <span>Embedded Video Player</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Disclaimer Preview */}
                      {disclaimerType !== "none" && (
                        <div className="text-[10px] text-muted-foreground bg-muted/60 p-2 rounded leading-tight">
                          {getDisclaimerText(disclaimerType)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: ALL POSTS ───────────────────────────────────────────── */}
        <TabsContent value="posts" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Published Broadcasts & Drafts</CardTitle>
              <CardDescription className="text-xs">
                Manage live posts, review view metrics, toggle publication status, or delete old entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPosts ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Loading posts...
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
                  <p className="text-sm font-medium">No posts published yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Create your first market update or video story using the Composer tab.
                  </p>
                  <Button size="sm" onClick={() => setActiveTab("compose")}>
                    Go to Composer
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Author</TableHead>
                        <TableHead>Headline & Content</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Media</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.map((post: any) => {
                        const author = post.persona?.name || post.custom_author_name || "Admin";
                        const avatar = post.persona?.avatar_url || post.custom_avatar_url || "";
                        const mediaCount = Array.isArray(post.media) ? post.media.length : 0;

                        return (
                          <TableRow key={post.id}>
                            <TableCell>
                              <img
                                src={avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"}
                                alt={author}
                                className="w-8 h-8 rounded-full object-cover border"
                              />
                            </TableCell>
                            <TableCell className="max-w-[280px]">
                              {post.title && (
                                <p className="text-xs font-semibold truncate">{post.title}</p>
                              )}
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {post.content}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {post.category.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono capitalize">
                                {post.post_type}
                              </span>
                            </TableCell>
                            <TableCell>
                              {mediaCount > 0 ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {mediaCount} item{mediaCount > 1 ? "s" : ""}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono font-medium">
                                {post.view_count || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={post.is_published}
                                onCheckedChange={(val) =>
                                  togglePublishMutation.mutate({ id: post.id, isPublished: val })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this post?")) {
                                    deletePostMutation.mutate(post.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: PERSONAS ─────────────────────────────────────────── */}
        <TabsContent value="personas" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Author Personas</CardTitle>
                  <CardDescription className="text-xs">
                    Create reusable profiles with custom avatars and roles to quickly sign posts.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsPersonaModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Persona
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPersonas ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Loading personas...
                </div>
              ) : personas.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <User className="h-8 w-8 mx-auto text-muted-foreground/60" />
                  <p className="text-sm font-medium">No saved personas</p>
                  <p className="text-xs text-muted-foreground">
                    Add a profile like &quot;Marko / Founder&quot; or &quot;KenyaFundFinder Desk&quot;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {personas.map((persona) => (
                    <div
                      key={persona.id}
                      className="border rounded-lg p-4 flex items-center gap-3 bg-card shadow-sm"
                    >
                      <img
                        src={persona.avatar_url}
                        alt={persona.name}
                        className="w-12 h-12 rounded-full object-cover border"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-semibold truncate">{persona.name}</h4>
                          {persona.is_default && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {persona.badge_title || "Author"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Persona Creation Dialog */}
      <Dialog open={isPersonaModalOpen} onOpenChange={setIsPersonaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Author Persona</DialogTitle>
            <DialogDescription>
              Add a recognizable profile avatar and title for your broadcasts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Persona Display Name</Label>
              <Input
                placeholder="e.g. Marko / Founder"
                value={newPersonaName}
                onChange={(e) => setNewPersonaName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Badge / Title</Label>
              <Input
                placeholder="e.g. Founder, Chief Analyst, Desk"
                value={newPersonaBadge}
                onChange={(e) => setNewPersonaBadge(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Avatar Image URL</Label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={newPersonaAvatarUrl}
                onChange={(e) => setNewPersonaAvatarUrl(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newPersonaIsDefault}
                onChange={(e) => setNewPersonaIsDefault(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>Set as default author for future posts</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPersonaModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createPersonaMutation.mutate()}
              disabled={createPersonaMutation.isPending}
            >
              Save Persona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
