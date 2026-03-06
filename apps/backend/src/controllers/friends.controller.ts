import { client } from "@repo/db/client";
import asyncHandler from "../utils/controller-utils/asynchandler";
import ApiResponse from "../utils/controller-utils/ApiResponse";
import ApiError from "../utils/controller-utils/ApiError";
import { AuthRequest } from "../middleware/requireAuth";

export const sendFriendRequest = asyncHandler(async (req: AuthRequest, res: any) => {
  const { addresseeEmail } = req.body;
  if (!addresseeEmail) {
    return new ApiError(400, "addresseeEmail is required").send(res);
  }

  const addressee = await client.user.findUnique({ where: { email: addresseeEmail } });
  if (!addressee) {
    return new ApiError(404, "User not found").send(res);
  }

  const requesterId = req.user!.userId;
  if (requesterId === addressee.id) {
    return new ApiError(400, "You cannot send a friend request to yourself").send(res);
  }

  const existing = await client.friend.findUnique({
    where: { requesterId_addresseeId: { requesterId, addresseeId: addressee.id } },
  });
  if (existing) {
    return new ApiError(409, "Friend request already exists").send(res);
  }

  const friend = await client.friend.create({
    data: { requesterId, addresseeId: addressee.id },
  });

  return new ApiResponse(201, friend, "Friend request sent").send(res);
});

export const acceptFriendRequest = asyncHandler(async (req: AuthRequest, res: any) => {
  const { friendId } = req.body;
  if (!friendId) {
    return new ApiError(400, "friendId is required").send(res);
  }

  const record = await client.friend.findUnique({ where: { id: friendId } });
  if (!record) {
    return new ApiError(404, "Friend request not found").send(res);
  }

  if (record.addresseeId !== req.user!.userId) {
    return new ApiError(403, "Not authorized to accept this request").send(res);
  }

  const updated = await client.friend.update({
    where: { id: friendId },
    data: { status: "ACCEPTED" },
  });

  return new ApiResponse(200, updated, "Friend request accepted").send(res);
});

export const declineFriendRequest = asyncHandler(async (req: AuthRequest, res: any) => {
  const { friendId } = req.body;
  if (!friendId) {
    return new ApiError(400, "friendId is required").send(res);
  }

  const record = await client.friend.findUnique({ where: { id: friendId } });
  if (!record) {
    return new ApiError(404, "Friend request not found").send(res);
  }

  if (record.addresseeId !== req.user!.userId) {
    return new ApiError(403, "Not authorized to decline this request").send(res);
  }

  const updated = await client.friend.update({
    where: { id: friendId },
    data: { status: "DECLINED" },
  });

  return new ApiResponse(200, updated, "Friend request declined").send(res);
});

export const listFriends = asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.userId;

  const friends = await client.friend.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, email: true, name: true } },
      addressee: { select: { id: true, email: true, name: true } },
    },
  });

  const result = friends.map((f) => {
    const friend = f.requesterId === userId ? f.addressee : f.requester;
    return { friendshipId: f.id, user: friend, since: f.createdAt };
  });

  return new ApiResponse(200, result, "Friends list").send(res);
});

export const listPendingRequests = asyncHandler(async (req: AuthRequest, res: any) => {
  const userId = req.user!.userId;

  const pending = await client.friend.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: {
      requester: { select: { id: true, email: true, name: true } },
    },
  });

  return new ApiResponse(200, pending, "Pending friend requests").send(res);
});
