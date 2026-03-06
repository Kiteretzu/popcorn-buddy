import { Router } from "express";
import requireAuth from "../middleware/requireAuth";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  listFriends,
  listPendingRequests,
} from "../controllers/friends.controller";

const router = Router();

router.use(requireAuth);

router.post("/request", sendFriendRequest);
router.post("/accept", acceptFriendRequest);
router.post("/decline", declineFriendRequest);
router.get("/", listFriends);
router.get("/pending", listPendingRequests);

export default router;
