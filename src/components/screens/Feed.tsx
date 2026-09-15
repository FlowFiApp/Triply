"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Bookmark,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Send,
  SquarePen,
  Trash2,
} from "lucide-react";
import { BottomTabBar, MobileShell } from "@/components/shell";
import Identicon from "@/components/ui/identicon";
import { SkeletonRows } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { motion } from "framer-motion";
import ShareMomentSheet from "@/components/screens/ShareMomentSheet";
import { useToast } from "@/lib/toast";
import { share } from "@/lib/share";
import { compactCount, feedHandle, feedKey, timeAgo } from "@/lib/feed-client";
import {
  useCommentMoment,
  useDeleteMoment,
  useFeed,
  useLikeMoment,
  useShareMoment,
} from "@/lib/api/hooks";
import type { FeedMoment } from "@/lib/feed";

function MomentImages({ images, alt }: { images: string[]; alt: string }) {
  const list = images.slice(0, 2);
  if (list.length === 0) return null;
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-card-2">
      {list.length === 1 ? (
        <Image src={list[0]} alt={alt} fill sizes="700px" className="object-cover" />
      ) : (
        <Swiper
          modules={[Pagination]}
          slidesPerView={1}
          pagination={{ clickable: true }}
          className="!h-full w-full [touch-action:pan-y]"
          style={
            {
              "--swiper-pagination-color": "#cdff9b",
              "--swiper-pagination-bullet-inactive-color": "#ffffff",
              "--swiper-pagination-bullet-inactive-opacity": "0.6",
              "--swiper-pagination-bottom": "10px",
            } as CSSProperties
          }
        >
          {list.map((src) => (
            <SwiperSlide key={src} className="!h-full">
              <div className="relative h-full w-full">
                <Image src={src} alt={alt} fill sizes="700px" className="object-cover" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}

function MomentCard({
  moment,
  onLike,
  onComments,
  onShare,
  onMenu,
}: {
  moment: FeedMoment;
  onLike: (m: FeedMoment) => void;
  onComments: (m: FeedMoment) => void;
  onShare: (m: FeedMoment) => void;
  onMenu: (m: FeedMoment) => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="block h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full">
            {moment.authorAvatar ? (
              <Image
                src={moment.authorAvatar}
                alt=""
                width={38}
                height={38}
                className="h-full w-full object-cover"
              />
            ) : (
              <Identicon seed={moment.userId} size={38} />
            )}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-foreground">
              {moment.authorName} · {timeAgo(moment.createdAt)}
            </span>
            {moment.location ? (
              <span className="text-[11px] text-muted">{moment.location}</span>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => onMenu(moment)}
          aria-label="More options"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <MomentImages images={moment.images} alt={moment.caption || "Travel moment"} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => onLike(moment)}
            aria-label="Like"
            whileTap={{ scale: 0.7 }}
            className="flex items-center gap-1"
          >
            <motion.span
              animate={{ scale: moment.likedByMe ? [1, 1.35, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart
                size={20}
                className={
                  moment.likedByMe
                    ? "fill-red-500 text-red-500"
                    : "text-foreground"
                }
              />
            </motion.span>
            <span className="text-[13px] font-semibold text-foreground">
              {compactCount(moment.likeCount)}
            </span>
          </motion.button>
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
}: {
  moment: FeedMoment | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const commentMoment = useCommentMoment();
  const [text, setText] = useState("");
  const [comments, setComments] = useState(moment?.comments ?? []);

  if (!moment) return null;

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await commentMoment.mutateAsync({ id: moment.id, text: value });
      setComments((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          userKey: feedKey(),
          text: value,
          createdAt: new Date().toISOString(),
        },
      ]);
      setText("");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Comment failed.");
    }
  };

  return (
    <Sheet open onClose={onClose} height="70vh">
      <div className="flex flex-col px-4 pb-6 pt-1">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold text-foreground">Comments</h2>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden">
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
            disabled={commentMoment.isPending || !text.trim()}
            className="shrink-0 text-[13px] font-bold text-accent-fg disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export default function Feed() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: moments = [], isLoading, error } = useFeed();
  const likeMoment = useLikeMoment();
  const deleteMoment = useDeleteMoment();
  const shareMoment = useShareMoment();
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsFor, setCommentsFor] = useState<FeedMoment | null>(null);
  const [menuFor, setMenuFor] = useState<FeedMoment | null>(null);

  const handleLike = (m: FeedMoment) => likeMoment.mutate(m.id);

  const handleShare = async (m: FeedMoment) => {
    shareMoment.mutate(m.id);
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

  const handleDelete = async (m: FeedMoment) => {
    if (!window.confirm("Delete this moment? This cannot be undone.")) return;
    setMenuFor(null);
    try {
      await deleteMoment.mutateAsync(m.id);
      toast("success", "Moment deleted.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Could not delete this moment.");
    }
  };

  const errorMessage = error instanceof Error ? error.message : "";

  const storyAuthors = Array.from(
    new Map(moments.map((m) => [m.userId, m])).values(),
  ).slice(0, 3);

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center justify-between bg-background px-4">
            <h1 className="text-[24px] font-extrabold leading-[35px] text-foreground">
              Feeds
            </h1>
            <button
              onClick={() => setShareOpen(true)}
              aria-label="Share a moment"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card-2 text-foreground"
            >
              <SquarePen size={18} className="text-accent-fg" />
            </button>
          </div></>}>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
                 <div className="flex gap-2 px-4 pb-1 pt-1">
            {[
              { key: "feeds", label: "Feeds", href: "/feed" },
              { key: "stays", label: "Accommodations", href: "/stays" },
              { key: "cars", label: "Cars", href: "/cars" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => router.push(tab.href)}
                className={`flex h-[32px] shrink-0 items-center rounded-full px-4 text-[13px] font-semibold transition ${
                  tab.key === "feeds"
                    ? "bg-accent text-accent-2"
                    : "bg-card-2 text-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3.5 overflow-x-auto px-4 py-3 no-scrollbar">
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

          <div className="flex flex-col gap-4 px-4 pb-6 pt-1">
            {isLoading ? (
              <SkeletonRows rows={3} height={360} />
            ) : errorMessage ? (
              <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted">
                {errorMessage}
              </p>
            ) : moments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-10 text-center">
                <p className="text-[15px] font-bold text-foreground">
                  No travel moments yet
                </p>
                <p className="text-[13px] text-muted">
                  Share your trip photos and start the feed.
                </p>
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-bold text-accent-2"
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
                  onMenu={setMenuFor}
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
      />
      <CommentsSheet
        key={commentsFor?.id ?? "none"}
        moment={commentsFor}
        onClose={() => setCommentsFor(null)}
      />

      {menuFor ? (
        <Sheet open onClose={() => setMenuFor(null)}>
          <div className="flex flex-col px-4 pb-6 pt-1">
            <h2 className="mb-2 text-[16px] font-extrabold text-foreground">
              Moment options
            </h2>
            <button
              onClick={() => {
                handleShare(menuFor);
                setMenuFor(null);
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-foreground hover:bg-card-2"
            >
              <Link2 size={18} className="text-accent-fg" />
              Share link
            </button>
            {menuFor.userId === feedKey() ? (
              <button
                onClick={() => handleDelete(menuFor)}
                className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold text-red-500 hover:bg-card-2"
              >
                <Trash2 size={18} />
                Delete post
              </button>
            ) : null}
          </div>
        </Sheet>
      ) : null}
    </MobileShell>
  );
}