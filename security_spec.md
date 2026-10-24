# Security Specification: Claude Fable 5.1 & E2EE Storage

## Data Invariants
1. A user document `/users/{userId}` can only be read or written by the authenticated user whose `request.auth.uid == userId`.
2. A chat session `/users/{userId}/chats/{chatId}` belongs strictly to the user (`request.auth.uid == userId` and `resource.data.userId == request.auth.uid`).
3. No user can read, list, create, or update another user's chat sessions.
4. An unauthenticated user cannot read or write any user records or chats.
5. All string fields have strict boundary lengths to prevent denial of wallet attacks.
6. The test connection document `/test/{testId}` allows reading for diagnostic connectivity checks.

## The Dirty Dozen Payloads (Targeting PERMISSION_DENIED)
1. **Unauthenticated Read User**: Attempt to `get(/users/user_abc)` with `auth == null`. (Expected: Denied)
2. **Unauthenticated Write User**: Attempt to `create(/users/user_abc)` with `auth == null`. (Expected: Denied)
3. **Cross-User Profile Read**: User `alice` attempts `get(/users/bob)`. (Expected: Denied)
4. **Cross-User Profile Write**: User `alice` attempts `set(/users/bob)`. (Expected: Denied)
5. **Cross-User Chat List**: User `alice` attempts `list(/users/bob/chats)`. (Expected: Denied)
6. **Cross-User Chat Read**: User `alice` attempts `get(/users/bob/chats/chat_1)`. (Expected: Denied)
7. **Cross-User Chat Create**: User `alice` attempts `create(/users/bob/chats/chat_1)`. (Expected: Denied)
8. **Spoofed Owner Chat Write**: User `alice` attempts `create(/users/alice/chats/chat_1)` with `userId: "bob"`. (Expected: Denied)
9. **Oversized Field Attack**: User `alice` sends title > 500 characters. (Expected: Denied)
10. **Shadow Key Injection**: User `alice` injects `{ isAdmin: true, bypass: true }` in chat doc. (Expected: Denied)
11. **Malformed ID Path**: User attempts write with invalid ID characters (`/users/alice/chats/$$$invalid###`). (Expected: Denied)
12. **Status or Immutable Mutation**: User attempts to alter immutable `createdAt` timestamp. (Expected: Denied)
