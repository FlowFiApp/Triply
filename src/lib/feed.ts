import type { MomentDoc } from "@/lib/db";

export type FeedComment = {
  id: string;
  userKey: string;
  text: string;
  createdAt: string;
};

export type FeedMoment = {
  id: string;
  userId: string;
  authorName: string;
  caption: string;
  location?: string;
  images: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  comments: FeedComment[];
  createdAt: string;
};

export function serializeMoment(m: MomentDoc, myKey: string): FeedMoment {
  return {
    id: m._id.toHexString(),
    userId: m.userId,
    authorName: m.authorName || "Traveler",
    caption: m.caption,
    location: m.location,
    images: m.images ?? [],
    likeCount: m.likes?.length ?? 0,
    commentCount: m.comments?.length ?? 0,
    shareCount: m.shareCount ?? 0,
    likedByMe: (m.likes ?? []).includes(myKey),
    comments: (m.comments ?? []).map((c) => ({
      id: c.id,
      userKey: c.userKey,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: m.createdAt.toISOString(),
  };
}