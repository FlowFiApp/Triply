"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  SquarePen,
  X,
} from "lucide-react";
import { BottomTabBar, MobileShell } from "@/components/shell";
import Identicon from "@/components/ui/identicon";
import { SkeletonRows } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui";
import ShareMomentSheet from "@/components/screens/ShareMomentSheet";
import { useQueryParam } from "@/lib/query";
import { useToast } from "@/lib/toast";
import { share } from "@/lib/share";
import {
  addMomentComment,
  compactCount,
  fetchFeed,
  feedHandle,
  incrementMomentShare,
  timeAgo,
  toggleMomentLike,
} from "@/lib/feed-client";
import type { FeedMoment } from "@/lib/feed";

function MomentCard({
  moment,
  onLike,
  onComments,
  onShare,
}: {
  moment: FeedMoment;
  onLike: (m: FeedMoment) => void;
  onComments: (m: FeedMoment) => void;
  onShare: (m: FeedMoment) => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Identicon seed={moment.userId} size={38} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-foreground">
              {moment.authorName} · {timeAgo(moment.createdAt)}
            </span>
            {moment.location ? (
              <span className="text-[11px] text-muted">{moment.location}</span>
            ) : null}
          </div>
        </div>
        <MoreHorizontal size={18} className="text-muted" />
      </div>

      <div className="overflow-hidden rounded-xl bg-card-2">
        {moment.images.length === 1 ? (
          <div className="relative aspect-[5/3] w-full">
            <Image
              src={moment.images[0]}
              alt={moment.caption || "Travel moment"}
              fill
              sizes="600px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 p-1.5">
            {moment.images.slice(0, 2).map((src) => (
              <div key={src} className="relative aspect-[5/4] w-full overflow-hidden rounded-lg">
                <Image
                  src={src}
                  alt={moment.caption || "Travel moment"}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(moment)}
            aria-label="Like"
            className="flex items-center gap-1"
          >
            <Heart
              size={20}
              className={moment.likedByMe ? "fill-red-500 text-red-500" : "text-foreground"}
            />
            <span className="text-[13px] font-semibold text-foreground">
              {compactCount(moment.likeCount)}
            </span>
          </button>
          <button
            onClick={() => onComments(moment)}
            aria-label="Comment"
            className="flex items-center gap-1"
          >
            <MessageCircle size={20} className="text-foreground" />
            <span className="text-[13px] font-semibold text-foreground">
              {compactCount(moment.commentCount)}
            </span>
          </button>
          <button onClick={() => onShare(moment)} aria-label="Share">
            <Send size={20} className="text-foreground" />
          </button>
        </div>
        <button onClick={() => onShare(moment)} aria-label="Save">
          <Bookmark size={20} className="text-muted" />
        </button>
      </div>

      {moment.caption ? (
        <p className="text-[13px] leading-5 text-foreground">{moment.caption}</p>
      ) : null}
      {moment.commentCount > 0 ? (
        <button
          onClick={() => onComments(moment)}
          className="text-left text-[12px] font-medium text-muted"
        >
          View all {compactCount(moment.commentCount)} comments
        </button>
      ) : null}
    </article>
  );
}

function CommentsSheet({
  moment,
  onClose,
  onAdded,
}: {
  moment: FeedMoment | null;
  onClose: () => void;
  onAdded: (commentCount: number) => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [comments, setComments] = useState(moment?.comments ?? []);
  const [sending, setSending] = useState(false);

  if (!moment) return null;

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    const result = await addMomentComment(moment.id, value);
    if (result.ok) {
      setComments((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          userKey: "me",
          text: value,
          createdAt: new Date().toISOString(),
        },
      ]);
      onAdded(comments.length + 1);
      setText("");
    } else {
      toast("error", result.error ?? "Comment failed.");
    }
    setSending(false);
  };

  return (
    <Sheet open onClose={onClose} height="70vh">
      <div className="flex flex-col px-5 pb-6 pt-1">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold text-foreground">Comments</h2>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-card-2 text-muted"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted">
              No comments yet. Be the first!
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Identicon seed={c.userKey} size={30} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-bold text-foreground">
                    {c.userKey === "me" ? "You" : feedHandle(c.userKey)}
                  </span>
                  <p className="text-[13px] leading-5 text-foreground">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a comment..."
            className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted"
          />
          <button
            onClick={submit}
            disabled={sending || !text.trim()}
            className="shrink-0 text-[13px] font-bold text-accent-2 disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export default function Feed() {
  const { toast } = useToast();
  const [moments, setMoments] = useState<FeedMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(
    useQueryParam("sheet", "") === "share",
  );
  const [commentsFor, setCommentsFor] = useState<FeedMoment | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchFeed();
      setMoments(result.moments);
      setError(result.error ?? "");
    } catch {
      setError("Feed is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  const handleLike = async (m: FeedMoment) => {
    setMoments((prev) =>
      prev.map((x) =>
        x.id === m.id
          ? {
              ...x,
              likedByMe: !x.likedByMe,
              likeCount: x.likeCount + (x.likedByMe ? -1 : 1),
            }
          : x,
      ),
    );
    await toggleMomentLike(m.id).catch(() => {});
  };

  const handleShare = async (m: FeedMoment) => {
    await incrementMomentShare(m.id).catch(() => {});
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/feed`;
    const result = await share({
      title: `${m.authorName} on Triply`,
      text: m.caption,
      url,
    });
    toast(
      result === "shared" ? "success" : "info",
      result === "shared" ? "Shared!" : result === "copied" ? "Link copied." : "Sharing unavailable.",
    );
  };

  const onPosted = (m: FeedMoment) => {
    setMoments((prev) => [m, ...prev]);
  };

  const storyAuthors = Array.from(
    new Map(moments.map((m) => [m.userId, m])).values(),
  ).slice(0, 3);

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between bg-background px-5">
            <h1 className="text-[24px] font-extrabold leading-[35px] text-foreground">
              Explore
            </h1>
            <button
              onClick={() => setShareOpen(true)}
              aria-label="Share a moment"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card-2 text-foreground"
            >
              <SquarePen size={18} className="text-accent-2" />
            </button>
          </div>

          <div className="flex gap-3.5 px-5 py-3">
            <button
              onClick={() => setShareOpen(true)}
              className="flex w-[58px] shrink-0 flex-col items-center gap-1.5"
            >
              <span className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-accent-2 bg-card-2">
                <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent text-[18px] font-bold text-accent-2">
                  +
                </span>
              </span>
              <span className="text-[11px] text-muted">Your Story</span>
            </button>
            {storyAuthors.map((m) => (
              <div key={m.userId} className="flex w-[58px] shrink-0 flex-col items-center gap-1.5">
                <span className="rounded-full border-2 border-accent p-0.5">
                  <Identicon seed={m.userId} size={52} />
                </span>
                <span className="w-full truncate text-center text-[11px] text-muted">
                  {feedHandle(m.userId)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 px-5 pb-6 pt-1">
            {loading ? (
              <SkeletonRows rows={3} height={360} />
            ) : error ? (
              <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted">
                {error}
              </p>
            ) : moments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center">
                <p className="text-[15px] font-bold text-foreground">
                  No travel moments yet
                </p>
                <p className="text-[13px] text-muted">
                  Share your trip photos and start the feed.
                </p>
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex h-10 items-center rounded-xl bg-accent px-5 text-[13px] font-bold text-accent-2"
                >
                  Share a Moment
                </button>
              </div>
            ) : (
              moments.map((m) => (
                <MomentCard
                  key={m.id}
                  moment={m}
                  onLike={handleLike}
                  onComments={setCommentsFor}
                  onShare={handleShare}
                />
              ))
            )}
          </div>
        </div>

        <BottomTabBar active="Feed" />
      </div>

      <ShareMomentSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onPosted={onPosted}
      />
      <CommentsSheet
        key={commentsFor?.id ?? "none"}
        moment={commentsFor}
        onClose={() => setCommentsFor(null)}
        onAdded={(count) => {
          if (commentsFor) {
            setMoments((prev) =>
              prev.map((x) => (x.id === commentsFor.id ? { ...x, commentCount: count } : x)),
            );
          }
        }}
      />
    </MobileShell>
  );
}